import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';

import type { AndroidBlockableApp, IOSBlockedItem, PermissionStatus } from 'expo-app-blocker';

import {
  applyAndroidOverlayTheme,
  getPermissions,
  listAndroidApps,
  requestNativePermissions,
  startAndroidBlock,
  startIosBlock,
  stopAndroidBlock,
  stopIosBlock,
} from '@/lib/blocker';
import {
  createMobileKeySecret,
  parseKeyPayload,
  verifyPulse,
} from '@/lib/mobile-key';
import { isNfcSupported, readTagId } from '@/lib/nfc';
import {
  DEFAULT_STATE,
  loadState,
  saveState,
  type ModeId,
  type TiempoState,
} from '@/lib/storage';

type TiempoContextValue = {
  ready: boolean;
  state: TiempoState;
  apps: AndroidBlockableApp[];
  permissions: PermissionStatus | null;
  nfcSupported: boolean;
  refreshPermissions: () => Promise<void>;
  requestPermissions: () => Promise<void>;
  pairTag: (id?: string) => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
  toggleLockWithTag: (simulate?: boolean) => Promise<void>;
  toggleLockWithMobileKey: (rawQr: string) => Promise<boolean>;
  ensureMobileKeySecret: () => Promise<string>;
  revokeMobileKey: () => Promise<void>;
  becomeKeyHolder: (secret: string, label?: string) => Promise<void>;
  clearKeyHolder: () => Promise<void>;
  setMode: (mode: ModeId) => void;
  togglePackage: (pkg: string) => void;
  setIosSelection: (selectionData: string, items: IOSBlockedItem[]) => void;
  setStrict: (value: boolean) => void;
};

const TiempoContext = createContext<TiempoContextValue | null>(null);

async function applyNativeLock(next: TiempoState) {
  if (Platform.OS === 'android') {
    await startAndroidBlock(next.selectedPackages);
  }
  if (Platform.OS === 'ios' && next.iosItems.length) {
    await startIosBlock(next.iosItems);
  }
}

async function clearNativeLock() {
  await stopAndroidBlock();
  await stopIosBlock();
}

function lockedGuard(current: TiempoState, action: string) {
  if (!current.locked) return false;
  Alert.alert('Bloqueado', `Para ${action}, acerca el tag NFC o escanea la llave móvil.`);
  return true;
}

export function TiempoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<TiempoState>(DEFAULT_STATE);
  const [apps, setApps] = useState<AndroidBlockableApp[]>([]);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const stateRef = useRef(state);
  const lockBusy = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persist = useCallback(async (updater: TiempoState | ((prev: TiempoState) => TiempoState)) => {
    const prev = stateRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    stateRef.current = next;
    setState(next);
    await saveState(next);
    return next;
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await loadState();
      stateRef.current = loaded;
      setState(loaded);
      try {
        await applyAndroidOverlayTheme();
      } catch {
        /* web / expo go */
      }
      const [perms, installed, nfc] = await Promise.all([
        getPermissions(),
        listAndroidApps(),
        isNfcSupported(),
      ]);
      setPermissions(perms);
      setApps(installed);
      setNfcSupported(nfc);

      if (loaded.locked) {
        const canAndroid = Platform.OS === 'android' && loaded.selectedPackages.length > 0;
        const canIos = Platform.OS === 'ios' && loaded.iosItems.length > 0;
        if (canAndroid || canIos) {
          try {
            await applyNativeLock(loaded);
          } catch {
            Alert.alert('Bloqueo', 'No se pudo reactivar el bloqueo. Revisa los permisos.');
          }
        }
        // Si no hay apps que bloquear, el estado locked se mantiene: solo sale con llave.
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const blocker = await import('expo-app-blocker');
        blocker.checkAndClearPendingUnlock();
        const sub = blocker.addPendingUnlockListener(() => {
          blocker.checkAndClearPendingUnlock();
        });
        remove = sub?.remove;
      } catch {
        /* módulo nativo ausente */
      }
    })();
    return () => remove?.();
  }, []);

  const refreshPermissions = useCallback(async () => {
    setPermissions(await getPermissions());
  }, []);

  const requestPerms = useCallback(async () => {
    setPermissions(await requestNativePermissions());
  }, []);

  const pairTag = useCallback(
    async (id?: string) => {
      if (lockedGuard(stateRef.current, 'cambiar el tag')) return false;
      if (id === 'DEMO-TAG' && !__DEV__) return false;
      const tagId = id ?? (await readTagId());
      if (!tagId) {
        Alert.alert('No se leyó el tag', 'Acerca un tag NFC al móvil e inténtalo de nuevo.');
        return false;
      }
      if (tagId === 'DEMO-TAG' && !__DEV__) return false;
      await persist((prev) => ({ ...prev, tagId }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    },
    [persist],
  );

  const completeOnboarding = useCallback(async () => {
    await persist((prev) => ({ ...prev, onboarded: true }));
  }, [persist]);

  const unlock = useCallback(
    async (current: TiempoState) => {
      await clearNativeLock();
      const endedAt = Date.now();
      const recovered = current.lockedAt ? endedAt - current.lockedAt : 0;
      await persist({
        ...current,
        locked: false,
        lockedAt: null,
        recoveredMs: current.recoveredMs + recovered,
        sessions: current.lockedAt
          ? [
              { mode: current.mode, startedAt: current.lockedAt, endedAt },
              ...current.sessions,
            ].slice(0, 40)
          : current.sessions,
      });
    },
    [persist],
  );

  const lock = useCallback(
    async (current: TiempoState) => {
      if (Platform.OS === 'android') {
        if (current.selectedPackages.length === 0) {
          Alert.alert('Elige apps', 'Marca al menos una app en la pestaña Apps antes de bloquear.');
          return;
        }
        await startAndroidBlock(current.selectedPackages);
      }
      if (Platform.OS === 'ios') {
        if (!current.iosItems.length) {
          Alert.alert(
            'Elige apps',
            'En iOS tienes que seleccionar las apps con el selector de Tiempo de uso.',
          );
          return;
        }
        await startIosBlock(current.iosItems);
      }
      await persist({ ...current, locked: true, lockedAt: Date.now() });
    },
    [persist],
  );

  const toggleWithIdentity = useCallback(
    async (next: TiempoState) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (next.locked) {
        await unlock(next);
      } else {
        await lock(next);
      }
    },
    [lock, unlock],
  );

  const toggleLockWithTag = useCallback(
    async (simulate = false) => {
      if (lockBusy.current) return;
      lockBusy.current = true;
      try {
        const current = stateRef.current;
        let tagId: string | null;

        if (simulate) {
          if (!__DEV__) {
            Alert.alert('Solo con llave', 'El desbloqueo solo funciona con el tag NFC o la llave móvil.');
            return;
          }
          tagId = current.tagId ?? 'DEMO-TAG';
        } else if (!nfcSupported) {
          Alert.alert(
            'NFC no disponible',
            'Usa “Escanear llave” con el móvil emparejado, o prueba en un teléfono con NFC.',
          );
          return;
        } else {
          tagId = await readTagId();
        }

        if (!tagId) {
          Alert.alert('Tag no detectado', 'Acerca el tag Tiempo a la parte trasera del móvil.');
          return;
        }
        if (tagId === 'DEMO-TAG' && !__DEV__) return;
        if (current.tagId && tagId !== current.tagId && !simulate) {
          Alert.alert('Tag distinto', 'Este no es el tag que emparejaste.');
          return;
        }

        await toggleWithIdentity(current.tagId ? current : { ...current, tagId });
      } finally {
        lockBusy.current = false;
      }
    },
    [nfcSupported, toggleWithIdentity],
  );

  const toggleLockWithMobileKey = useCallback(
    async (rawQr: string) => {
      if (lockBusy.current) return false;
      lockBusy.current = true;
      try {
        const current = stateRef.current;
        if (!current.mobileKeySecret) {
          Alert.alert('Sin llave móvil', 'Crea una llave móvil en Ajustes y empareja el otro teléfono.');
          return false;
        }
        const payload = parseKeyPayload(rawQr);
        if (!payload || payload.t !== 'pulse') {
          Alert.alert('QR no válido', 'Pide que te muestren el QR de “Soy la llave” (no el de emparejar).');
          return false;
        }
        const ok = await verifyPulse(payload, current.mobileKeySecret);
        if (!ok) {
          Alert.alert('Llave rechazada', 'El QR expiró o no corresponde a tu llave. Genera uno nuevo.');
          return false;
        }
        await toggleWithIdentity(current);
        return true;
      } finally {
        lockBusy.current = false;
      }
    },
    [toggleWithIdentity],
  );

  const ensureMobileKeySecret = useCallback(async () => {
    const current = stateRef.current;
    if (lockedGuard(current, 'crear o mostrar la llave')) {
      return current.mobileKeySecret ?? '';
    }
    if (current.mobileKeySecret) return current.mobileKeySecret;
    const secret = await createMobileKeySecret();
    await persist((prev) => ({ ...prev, mobileKeySecret: secret }));
    return secret;
  }, [persist]);

  const revokeMobileKey = useCallback(async () => {
    if (lockedGuard(stateRef.current, 'revocar la llave')) return;
    await persist((prev) => ({ ...prev, mobileKeySecret: null }));
  }, [persist]);

  const becomeKeyHolder = useCallback(
    async (secret: string, label?: string) => {
      await persist((prev) => ({
        ...prev,
        keyHolderSecret: secret,
        keyHolderLabel: label ?? 'Tiempo',
        onboarded: true,
      }));
    },
    [persist],
  );

  const clearKeyHolder = useCallback(async () => {
    await persist((prev) => ({ ...prev, keyHolderSecret: null, keyHolderLabel: null }));
  }, [persist]);

  const setMode = useCallback(
    (mode: ModeId) => {
      if (lockedGuard(stateRef.current, 'cambiar de modo')) return;
      void persist((prev) => ({ ...prev, mode }));
    },
    [persist],
  );

  const togglePackage = useCallback(
    (pkg: string) => {
      if (lockedGuard(stateRef.current, 'cambiar las apps')) return;
      void persist((prev) => {
        const selectedPackages = prev.selectedPackages.includes(pkg)
          ? prev.selectedPackages.filter((item) => item !== pkg)
          : [...prev.selectedPackages, pkg];
        return { ...prev, selectedPackages };
      });
    },
    [persist],
  );

  const setIosSelection = useCallback(
    (iosSelectionData: string, iosItems: IOSBlockedItem[]) => {
      if (lockedGuard(stateRef.current, 'cambiar las apps')) return;
      void persist((prev) => ({ ...prev, iosSelectionData, iosItems }));
    },
    [persist],
  );

  const setStrict = useCallback(
    (_strict: boolean) => {
      Alert.alert(
        'Modo estricto fijo',
        'Mientras hay bloqueo, solo el tag NFC o la llave móvil pueden desbloquear. No hay atajos.',
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      ready,
      state,
      apps,
      permissions,
      nfcSupported,
      refreshPermissions,
      requestPermissions: requestPerms,
      pairTag,
      completeOnboarding,
      toggleLockWithTag,
      toggleLockWithMobileKey,
      ensureMobileKeySecret,
      revokeMobileKey,
      becomeKeyHolder,
      clearKeyHolder,
      setMode,
      togglePackage,
      setIosSelection,
      setStrict,
    }),
    [
      apps,
      becomeKeyHolder,
      clearKeyHolder,
      completeOnboarding,
      ensureMobileKeySecret,
      nfcSupported,
      pairTag,
      permissions,
      ready,
      refreshPermissions,
      requestPerms,
      revokeMobileKey,
      setIosSelection,
      setMode,
      setStrict,
      state,
      toggleLockWithMobileKey,
      toggleLockWithTag,
      togglePackage,
    ],
  );

  return <TiempoContext.Provider value={value}>{children}</TiempoContext.Provider>;
}

export function useTiempo() {
  const ctx = useContext(TiempoContext);
  if (!ctx) throw new Error('useTiempo must be used within TiempoProvider');
  return ctx;
}
