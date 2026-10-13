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
import { Alert, AppState, Platform } from 'react-native';

import type { AndroidBlockableApp, IOSBlockedItem, PermissionStatus } from 'expo-app-blocker';

import { useI18n, type Translate } from '@/i18n';
import { refreshBlockedAttempts, watchBlockedAttempts } from '@/lib/blocked-attempts-sync';
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
  INITIAL_MONO_CLOCK,
  acceptsStrictConfirmation,
  advanceEmergencyClock,
  canDropKey,
  consumeEmergency,
  hasBackupKey,
  monotonicNow,
  type EmergencySnapshot,
  type MonoClock,
} from '@/lib/emergency';
import { ownAppIds } from '@/lib/own-app';
import { guardIosSelection, withoutOwnPackages } from '@/lib/self-block';
import {
  createMobileKeySecret,
  parseKeyPayload,
  rememberNonce,
  verifyPulse,
} from '@/lib/mobile-key';
import {
  cancelActiveNfcSession,
  confirmTag,
  getNfcStatus,
  openNfcSettings as openSystemNfcSettings,
  readTag,
} from '@/lib/nfc';
import type { NfcFailure } from '@/lib/nfc-types';
import { sameTagId } from '@/lib/tag-id';
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
  nfcEnabled: boolean;
  nfcNotice: NfcNotice | null;
  nfcActivity: NfcActivity | null;
  clearNfcNotice: () => void;
  openNfcSettings: () => Promise<void>;
  refreshNfcStatus: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  requestPermissions: () => Promise<void>;
  pairTag: (id?: string) => Promise<boolean>;
  pairSpareTag: (id?: string) => Promise<boolean>;
  clearSpareTag: () => Promise<void>;
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
  setStrict: (value: boolean, confirmation?: string) => void;
  emergencyUnlock: () => Promise<boolean>;
  refreshEmergencyClock: () => Promise<void>;
  /** True when the wall clock is behind the last accepted timestamp. */
  clockSkewed: boolean;
};

const TiempoContext = createContext<TiempoContextValue | null>(null);

const SIMULATED_TAG_IDS = new Set(['DEMO-TAG', 'DEMO-SPARE']);

export type NfcScope = 'pair' | 'spare' | 'toggle';
export type NfcActivity = { scope: NfcScope; phase: 'reading' | 'confirm' | 'auth' };
export type NfcNotice = { scope: NfcScope; error: NfcFailure };

function isSimulatedTag(id: string) {
  return SIMULATED_TAG_IDS.has(id);
}

function devPreset(id?: string): string | null {
  if (!id || !__DEV__ || !isSimulatedTag(id)) return null;
  return id;
}

function knownTagIds(state: TiempoState): string[] {
  return [state.tagId, state.spareTagId].filter((id): id is string => !!id);
}

function snapshot(state: TiempoState): EmergencySnapshot {
  return {
    emergencyLeft: state.emergencyLeft,
    emergencyRefillAt: state.emergencyRefillAt,
    lastSeenAt: state.lastSeenAt,
    strict: state.strict,
  };
}

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

function lockedGuard(current: TiempoState, action: string, t: Translate) {
  if (!current.locked) return false;
  Alert.alert(t('alerts.locked.title'), t('alerts.locked.body', { action }));
  return true;
}

export function TiempoProvider({ children }: { children: ReactNode }) {
  const { locale, t } = useI18n();
  const tRef = useRef(t);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<TiempoState>(DEFAULT_STATE);
  const [apps, setApps] = useState<AndroidBlockableApp[]>([]);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [nfcNotice, setNfcNotice] = useState<NfcNotice | null>(null);
  const [nfcActivity, setNfcActivity] = useState<NfcActivity | null>(null);
  const nfcToken = useRef(0);
  const [clockSkewed, setClockSkewed] = useState(false);
  const stateRef = useRef(state);
  const lockBusy = useRef(false);
  const clockRef = useRef<MonoClock>(INITIAL_MONO_CLOCK);
  const persistQueue = useRef(Promise.resolve());

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persist = useCallback(async (updater: TiempoState | ((prev: TiempoState) => TiempoState)) => {
    const run = persistQueue.current.then(async () => {
      const prev = stateRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      stateRef.current = next;
      setState(next);
      await saveState(next);
      return next;
    });
    persistQueue.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const refreshEmergencyClock = useCallback(async () => {
    const now = Date.now();
    const mono = monotonicNow();
    await persist((prev) => {
      const { state: timed, clock } = advanceEmergencyClock(snapshot(prev), clockRef.current, now, mono);
      clockRef.current = clock;
      if (
        timed.emergencyLeft === prev.emergencyLeft &&
        timed.emergencyRefillAt === prev.emergencyRefillAt &&
        timed.lastSeenAt === prev.lastSeenAt
      ) {
        return prev;
      }
      return {
        ...prev,
        emergencyLeft: timed.emergencyLeft,
        emergencyRefillAt: timed.emergencyRefillAt,
        lastSeenAt: timed.lastSeenAt,
      };
    });
    setClockSkewed(Date.now() < stateRef.current.lastSeenAt);
  }, [persist]);

  const refreshNfcStatus = useCallback(async () => {
    const status = await getNfcStatus();
    setNfcSupported(status.supported);
    setNfcEnabled(status.enabled);
    setNfcNotice((current) => {
      if (!current) return current;
      if (current.error === 'disabled' && status.enabled) return null;
      if (current.error === 'unsupported' && status.supported) return null;
      return current;
    });
  }, []);

  const beginNfc = useCallback((scope: NfcScope, phase: NfcActivity['phase'] = 'reading') => {
    const token = ++nfcToken.current;
    setNfcNotice(null);
    setNfcActivity({ scope, phase });
    return token;
  }, []);

  const failNfc = useCallback((token: number, scope: NfcScope, error: NfcFailure) => {
    if (token !== nfcToken.current) return;
    setNfcActivity(null);
    setNfcNotice({ scope, error });
    if (error !== 'cancelled') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  const succeedNfc = useCallback((token: number) => {
    if (token !== nfcToken.current) return false;
    setNfcActivity(null);
    setNfcNotice(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return true;
  }, []);

  const showNfcPhase = useCallback((token: number, scope: NfcScope, phase: NfcActivity['phase']) => {
    if (token !== nfcToken.current) return;
    setNfcActivity({ scope, phase });
  }, []);

  const clearNfcNotice = useCallback(() => {
    setNfcNotice(null);
  }, []);

  const openNfcSettings = useCallback(async () => {
    await openSystemNfcSettings();
  }, []);

  /** While locked, prove a known tag without ending the session. */
  const authorizeLockedChange = useCallback(
    async (token: number, scope: NfcScope) => {
      const current = stateRef.current;
      if (!current.locked) return true;
      const known = knownTagIds(current);
      if (known.length === 0) {
        failNfc(token, scope, 'auth-failed');
        return false;
      }
      showNfcPhase(token, scope, 'auth');
      const read = await readTag({ alertMessage: t('nfc.authPrompt') });
      if (token !== nfcToken.current) return false;
      if (!read.ok) {
        failNfc(token, scope, read.error);
        return false;
      }
      if (!known.some((id) => sameTagId(id, read.id))) {
        failNfc(token, scope, 'auth-failed');
        return false;
      }
      return true;
    },
    [failNfc, showNfcPhase, t],
  );

  useEffect(() => {
    void (async () => {
      const loaded = await loadState();
      stateRef.current = loaded;
      setState(loaded);
      const [perms, nfc] = await Promise.all([getPermissions(), getNfcStatus()]);
      setPermissions(perms);
      setNfcSupported(nfc.supported);
      setNfcEnabled(nfc.enabled);

      if (loaded.locked) {
        const canAndroid = Platform.OS === 'android' && loaded.selectedPackages.length > 0;
        const canIos = Platform.OS === 'ios' && loaded.iosItems.length > 0;
        if (canAndroid || canIos) {
          try {
            await applyNativeLock(loaded);
          } catch {
            Alert.alert(tRef.current('alerts.relock.title'), tRef.current('alerts.relock.body'));
          }
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    void applyAndroidOverlayTheme(locale).catch(() => {
      /* web / expo go */
    });
    void listAndroidApps(locale).then(setApps);
  }, [locale]);

  useEffect(() => {
    if (!ready) return;
    void refreshEmergencyClock();
    const sub = AppState.addEventListener('change', (next) => {
      void refreshEmergencyClock();
      if (next === 'active') void refreshNfcStatus();
      if (next === 'background') cancelActiveNfcSession();
    });
    const id = setInterval(() => {
      void refreshEmergencyClock();
    }, 60_000);
    return () => {
      sub?.remove();
      clearInterval(id);
    };
  }, [ready, refreshEmergencyClock, refreshNfcStatus]);

  useEffect(() => () => cancelActiveNfcSession(), []);

  useEffect(() => {
    watchBlockedAttempts();
    void refreshBlockedAttempts();
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
      if (id && isSimulatedTag(id) && !__DEV__) return false;
      const token = beginNfc('pair');
      const preset = devPreset(id);
      if (preset) {
        if (
          stateRef.current.spareTagId === preset ||
          (stateRef.current.spareTagId && sameTagId(preset, stateRef.current.spareTagId))
        ) {
          failNfc(token, 'pair', 'same-as-spare');
          return false;
        }
        try {
          await persist((prev) => ({ ...prev, tagId: preset }));
        } catch {
          failNfc(token, 'pair', 'unknown');
          return false;
        }
        return succeedNfc(token);
      }
      const allowed = await authorizeLockedChange(token, 'pair');
      if (!allowed || token !== nfcToken.current) return false;
      const replacing = Boolean(stateRef.current.tagId);
      const read = await confirmTag(
        {
          first: replacing ? t('nfc.newTagPrompt') : t('nfc.scanPrompt'),
          second: t('nfc.confirmPrompt'),
        },
        (step) => showNfcPhase(token, 'pair', step === 'second' ? 'confirm' : 'reading'),
      );
      if (token !== nfcToken.current) return false;
      if (!read.ok) {
        failNfc(token, 'pair', read.error);
        return false;
      }
      if (isSimulatedTag(read.id) && !__DEV__) {
        failNfc(token, 'pair', 'unknown');
        return false;
      }
      if (stateRef.current.spareTagId && sameTagId(read.id, stateRef.current.spareTagId)) {
        failNfc(token, 'pair', 'same-as-spare');
        return false;
      }
      try {
        await persist((prev) => ({ ...prev, tagId: read.id }));
      } catch {
        failNfc(token, 'pair', 'unknown');
        return false;
      }
      return succeedNfc(token);
    },
    [authorizeLockedChange, beginNfc, failNfc, persist, showNfcPhase, succeedNfc, t],
  );

  const pairSpareTag = useCallback(
    async (id?: string) => {
      if (id && isSimulatedTag(id) && !__DEV__) return false;
      const token = beginNfc('spare');
      if (!stateRef.current.tagId) {
        failNfc(token, 'spare', 'need-primary');
        return false;
      }
      const preset = devPreset(id);
      if (preset) {
        if (
          stateRef.current.tagId === preset ||
          (stateRef.current.tagId != null && sameTagId(preset, stateRef.current.tagId))
        ) {
          failNfc(token, 'spare', 'same-as-primary');
          return false;
        }
        try {
          await persist((prev) => ({ ...prev, spareTagId: preset }));
        } catch {
          failNfc(token, 'spare', 'unknown');
          return false;
        }
        return succeedNfc(token);
      }
      const allowed = await authorizeLockedChange(token, 'spare');
      if (!allowed || token !== nfcToken.current) return false;
      const read = await confirmTag(
        { first: t('nfc.newTagPrompt'), second: t('nfc.confirmPrompt') },
        (step) => showNfcPhase(token, 'spare', step === 'second' ? 'confirm' : 'reading'),
      );
      if (token !== nfcToken.current) return false;
      if (!read.ok) {
        failNfc(token, 'spare', read.error);
        return false;
      }
      if (isSimulatedTag(read.id) && !__DEV__) {
        failNfc(token, 'spare', 'unknown');
        return false;
      }
      if (stateRef.current.tagId && sameTagId(read.id, stateRef.current.tagId)) {
        failNfc(token, 'spare', 'same-as-primary');
        return false;
      }
      try {
        await persist((prev) => ({ ...prev, spareTagId: read.id }));
      } catch {
        failNfc(token, 'spare', 'unknown');
        return false;
      }
      return succeedNfc(token);
    },
    [authorizeLockedChange, beginNfc, failNfc, persist, showNfcPhase, succeedNfc, t],
  );

  const clearSpareTag = useCallback(async () => {
    if (lockedGuard(stateRef.current, t('alerts.actions.removeSpare'), t)) return;
    if (!canDropKey(stateRef.current, { spareTagId: null })) {
      Alert.alert(t('alerts.strictRemove.title'), t('alerts.strictRemove.body'));
      return;
    }
    await persist((prev) => {
      if (!canDropKey(prev, { spareTagId: null })) return prev;
      return { ...prev, spareTagId: null };
    });
  }, [persist, t]);

  const completeOnboarding = useCallback(async () => {
    await persist((prev) => ({ ...prev, onboarded: true }));
  }, [persist]);

  const unlock = useCallback(
    async (options?: { emergency?: boolean; pulse?: { nonce: string; ts: number } }) => {
      const latest = stateRef.current;
      if (!latest.locked) return false;
      if (options?.emergency && !consumeEmergency(snapshot(latest), Date.now())) return false;
      await clearNativeLock();
      let spent = false;
      await persist((prev) => {
        if (!prev.locked) return prev;
        const endedAt = Date.now();
        const recovered = prev.lockedAt ? Math.max(0, endedAt - prev.lockedAt) : 0;
        const consumed = options?.emergency ? consumeEmergency(snapshot(prev), endedAt) : null;
        if (options?.emergency && !consumed) return prev;
        spent = true;
        return {
          ...prev,
          ...(consumed
            ? {
                emergencyLeft: consumed.emergencyLeft,
                emergencyRefillAt: consumed.emergencyRefillAt,
                lastSeenAt: Math.max(consumed.lastSeenAt, endedAt),
              }
            : {}),
          ...(options?.pulse
            ? {
                usedMobileKeyNonces: rememberNonce(
                  prev.usedMobileKeyNonces,
                  options.pulse.nonce,
                  options.pulse.ts,
                  endedAt,
                  prev.lastSeenAt,
                ),
              }
            : {}),
          locked: false,
          lockedAt: null,
          recoveredMs: prev.recoveredMs + recovered,
          sessions: prev.lockedAt
            ? [
                {
                  mode: prev.mode,
                  startedAt: prev.lockedAt,
                  endedAt,
                  ...(options?.emergency ? { emergency: true as const } : {}),
                },
                ...prev.sessions,
              ].slice(0, 40)
            : prev.sessions,
        };
      });
      if (!spent) {
        const current = stateRef.current;
        if (current.locked) {
          try {
            await applyNativeLock(current);
          } catch {
            /* the saved lock is reapplied on next launch */
          }
        }
        return false;
      }
      return true;
    },
    [persist],
  );

  const lock = useCallback(
    async (current: TiempoState, pulse?: { nonce: string; ts: number }) => {
      if (Platform.OS === 'android') {
        if (current.selectedPackages.length === 0) {
          Alert.alert(t('alerts.chooseApps.title'), t('alerts.chooseApps.android'));
          return;
        }
        await startAndroidBlock(current.selectedPackages);
      }
      if (Platform.OS === 'ios') {
        const guarded = guardIosSelection(current.iosItems, ownAppIds());
        if (!guarded.items.length) {
          Alert.alert(
            t('alerts.chooseApps.title'),
            guarded.ignoredCategories > 0
              ? t('alerts.chooseApps.iosCategories')
              : t('alerts.chooseApps.ios'),
          );
          return;
        }
        await startIosBlock(guarded.items);
      }
      const lockedAt = Date.now();
      await persist((prev) => ({
        ...prev,
        tagId: current.tagId ?? prev.tagId,
        locked: true,
        lockedAt,
        ...(pulse
          ? {
              usedMobileKeyNonces: rememberNonce(
                prev.usedMobileKeyNonces,
                pulse.nonce,
                pulse.ts,
                lockedAt,
                prev.lastSeenAt,
              ),
            }
          : {}),
      }));
    },
    [persist, t],
  );

  const toggleWithIdentity = useCallback(
    async (next: TiempoState, pulse?: { nonce: string; ts: number }) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (next.locked) {
        await unlock(pulse ? { pulse } : undefined);
      } else {
        await lock(next, pulse);
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

        if (simulate) {
          if (!__DEV__) {
            Alert.alert(t('alerts.keyOnly.title'), t('alerts.keyOnly.body'));
            return;
          }
          const tagId = current.tagId ?? current.spareTagId ?? 'DEMO-TAG';
          const identity = current.tagId || current.spareTagId ? current : { ...current, tagId };
          setNfcNotice(null);
          setNfcActivity(null);
          await toggleWithIdentity(identity);
          return;
        }

        if (current.locked && !current.tagId && !current.spareTagId) {
          const token = beginNfc('toggle');
          failNfc(token, 'toggle', 'no-paired-tag');
          return;
        }

        const token = beginNfc('toggle');
        let tagId: string;
        if (!current.tagId && !current.spareTagId) {
          const read = await confirmTag(
            { first: t('nfc.scanPrompt'), second: t('nfc.confirmPrompt') },
            (step) => showNfcPhase(token, 'toggle', step === 'second' ? 'confirm' : 'reading'),
          );
          if (token !== nfcToken.current) return;
          if (!read.ok) {
            failNfc(token, 'toggle', read.error);
            return;
          }
          tagId = read.id;
        } else {
          const read = await readTag({ alertMessage: t('nfc.scanPrompt') });
          if (token !== nfcToken.current) return;
          if (!read.ok) {
            failNfc(token, 'toggle', read.error);
            return;
          }
          tagId = read.id;
        }

        if (isSimulatedTag(tagId) && !__DEV__) {
          failNfc(token, 'toggle', 'unknown');
          return;
        }
        const known = knownTagIds(stateRef.current);
        if (known.length > 0 && !known.some((id) => sameTagId(id, tagId))) {
          failNfc(token, 'toggle', 'wrong-tag');
          return;
        }

        const latest = stateRef.current;
        const identity = latest.tagId || known.length > 0 ? latest : { ...latest, tagId };
        if (token === nfcToken.current) {
          setNfcActivity(null);
          setNfcNotice(null);
        }
        await toggleWithIdentity(identity);
      } finally {
        lockBusy.current = false;
      }
    },
    [beginNfc, failNfc, showNfcPhase, t, toggleWithIdentity],
  );

  const toggleLockWithMobileKey = useCallback(
    async (rawQr: string) => {
      if (lockBusy.current) return false;
      lockBusy.current = true;
      try {
        const current = stateRef.current;
        if (!current.mobileKeySecret) {
          Alert.alert(t('alerts.noPhoneKey.title'), t('alerts.noPhoneKey.body'));
          return false;
        }
        const payload = parseKeyPayload(rawQr);
        if (!payload || payload.t !== 'pulse') {
          Alert.alert(t('alerts.badQr.title'), t('alerts.badQr.body'));
          return false;
        }
        const verdict = verifyPulse(payload, current.mobileKeySecret, {
          now: Date.now(),
          usedNonces: current.usedMobileKeyNonces,
        });
        if (!verdict.ok) {
          if (verdict.reason === 'replay') {
            Alert.alert(t('alerts.replayedKey.title'), t('alerts.replayedKey.body'));
          } else if (verdict.reason === 'legacy') {
            Alert.alert(t('alerts.legacyKey.title'), t('alerts.legacyKey.body'));
          } else {
            Alert.alert(t('alerts.rejectedKey.title'), t('alerts.rejectedKey.body'));
          }
          return false;
        }
        await toggleWithIdentity(current, { nonce: verdict.nonce, ts: verdict.ts });
        return true;
      } finally {
        lockBusy.current = false;
      }
    },
    [t, toggleWithIdentity],
  );

  const ensureMobileKeySecret = useCallback(async () => {
    const current = stateRef.current;
    if (lockedGuard(current, t('alerts.actions.showKey'), t)) {
      return current.mobileKeySecret ?? '';
    }
    if (current.mobileKeySecret) return current.mobileKeySecret;
    const secret = await createMobileKeySecret();
    await persist((prev) => ({ ...prev, mobileKeySecret: secret }));
    return secret;
  }, [persist, t]);

  const revokeMobileKey = useCallback(async () => {
    if (lockedGuard(stateRef.current, t('alerts.actions.revokeKey'), t)) return;
    if (!canDropKey(stateRef.current, { mobileKeySecret: null })) {
      Alert.alert(t('alerts.strictRevoke.title'), t('alerts.strictRevoke.body'));
      return;
    }
    await persist((prev) => {
      if (!canDropKey(prev, { mobileKeySecret: null })) return prev;
      return { ...prev, mobileKeySecret: null, usedMobileKeyNonces: [] };
    });
  }, [persist, t]);

  const becomeKeyHolder = useCallback(
    async (secret: string, label?: string) => {
      await persist((prev) => ({
        ...prev,
        keyHolderSecret: secret,
        keyHolderLabel: label ?? 'Apartag',
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
      if (lockedGuard(stateRef.current, t('alerts.actions.changeMode'), t)) return;
      void persist((prev) => ({ ...prev, mode }));
    },
    [persist, t],
  );

  const togglePackage = useCallback(
    (pkg: string) => {
      if (lockedGuard(stateRef.current, t('alerts.actions.changeApps'), t)) return;
      if (withoutOwnPackages([pkg], ownAppIds()).length === 0) return;
      void persist((prev) => {
        const selectedPackages = prev.selectedPackages.includes(pkg)
          ? prev.selectedPackages.filter((item) => item !== pkg)
          : [...prev.selectedPackages, pkg];
        return { ...prev, selectedPackages: withoutOwnPackages(selectedPackages, ownAppIds()) };
      });
    },
    [persist, t],
  );

  const setIosSelection = useCallback(
    (iosSelectionData: string, iosItems: IOSBlockedItem[]) => {
      if (lockedGuard(stateRef.current, t('alerts.actions.changeApps'), t)) return;
      const guarded = guardIosSelection(iosItems, ownAppIds());
      void persist((prev) => ({ ...prev, iosSelectionData, iosItems: guarded.items }));
    },
    [persist, t],
  );

  const setStrict = useCallback(
    (value: boolean, confirmation?: string) => {
      const current = stateRef.current;
      if (value) {
        if (current.strict) return;
        if (!hasBackupKey(current)) {
          Alert.alert(t('alerts.strictBackup.title'), t('alerts.strictBackup.body'));
          return;
        }
        if (!acceptsStrictConfirmation(confirmation)) {
          Alert.alert(t('alerts.strictConfirm.title'), t('alerts.strictConfirm.body', { word: t('strict.word') }));
          return;
        }
        void persist((prev) => {
          if (prev.strict || !hasBackupKey(prev)) return prev;
          return { ...prev, strict: true };
        });
        return;
      }
      if (!current.strict) return;
      if (current.locked) {
        Alert.alert(t('alerts.strictLocked.title'), t('alerts.strictLocked.body'));
        return;
      }
      void persist((prev) => {
        if (!prev.strict || prev.locked) return prev;
        return { ...prev, strict: false };
      });
    },
    [persist, t],
  );

  const emergencyUnlock = useCallback(async () => {
    if (lockBusy.current) return false;
    await refreshEmergencyClock();
    const current = stateRef.current;
    if (!current.locked) return false;
    if (current.strict) {
      Alert.alert(t('alerts.strictNoEmergency.title'), t('alerts.strictNoEmergency.body'));
      return false;
    }
    if (current.emergencyLeft <= 0) {
      Alert.alert(t('alerts.noEmergencies.title'), t('alerts.noEmergencies.body'));
      return false;
    }
    lockBusy.current = true;
    try {
      const ok = await unlock({ emergency: true });
      if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return ok;
    } finally {
      lockBusy.current = false;
    }
  }, [refreshEmergencyClock, t, unlock]);

  const value = useMemo(
    () => ({
      ready,
      state,
      apps,
      permissions,
      nfcSupported,
      nfcEnabled,
      nfcNotice,
      nfcActivity,
      clearNfcNotice,
      openNfcSettings,
      refreshNfcStatus,
      refreshPermissions,
      requestPermissions: requestPerms,
      pairTag,
      pairSpareTag,
      clearSpareTag,
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
      emergencyUnlock,
      refreshEmergencyClock,
      clockSkewed,
    }),
    [
      apps,
      becomeKeyHolder,
      clearKeyHolder,
      clearNfcNotice,
      clearSpareTag,
      clockSkewed,
      completeOnboarding,
      emergencyUnlock,
      ensureMobileKeySecret,
      nfcActivity,
      nfcEnabled,
      nfcNotice,
      nfcSupported,
      openNfcSettings,
      pairSpareTag,
      pairTag,
      permissions,
      ready,
      refreshEmergencyClock,
      refreshNfcStatus,
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
