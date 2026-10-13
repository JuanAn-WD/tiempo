import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { DeviceOnlyNotice } from '@/components/device-only-notice';
import { PermissionExplainer } from '@/components/permission-explainer';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Type } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { usePermissionRecord } from '@/lib/permission-ack';
import { openPermissionSettings, readPermissions, requestPermission } from '@/lib/permission-actions';
import {
  activeStep,
  firstPendingIndex,
  normalizePlatform,
  parseFlowScope,
  stepsFor,
  type PermissionId,
  type PermissionSnapshot,
} from '@/lib/permission-flow';

function blank(ids: readonly PermissionId[]): Record<PermissionId, PermissionSnapshot> {
  const snapshot = {} as Record<PermissionId, PermissionSnapshot>;
  for (const id of ids) {
    snapshot[id] =
      id === 'accessibility'
        ? { outcome: 'notUsed', canAskAgain: false }
        : { outcome: 'undetermined', canAskAgain: true };
  }
  return snapshot;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ scope?: string }>();
  const scope = parseFlowScope(params.scope);
  const steps = useMemo(() => stepsFor(normalizePlatform(Platform.OS), scope), [scope]);
  const { record, ready: recordReady, markSeen, markAttempted } = usePermissionRecord();
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [snapshot, setSnapshot] = useState(() => blank(steps));
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const waiting = useRef<PermissionId | null>(null);
  const stepsRef = useRef(steps);
  const indexRef = useRef(index);

  useEffect(() => {
    stepsRef.current = steps;
    indexRef.current = index;
  });

  const cameraGranted = cameraPermission?.granted;
  const cameraCanAskAgain = cameraPermission?.canAskAgain;
  const cameraStatus = cameraPermission?.status;
  const attemptedKey = record.attempted.join(',');

  const refresh = useCallback(async () => {
    const camera =
      cameraGranted === undefined
        ? null
        : {
            granted: cameraGranted,
            canAskAgain: cameraCanAskAgain ?? true,
            status: cameraStatus ?? 'undetermined',
          };
    const next = await readPermissions(steps, new Set(attemptedKey.split(',').filter(Boolean) as PermissionId[]), camera);
    setSnapshot((prev) => ({ ...prev, ...next }));
    setLoaded(true);
    return next;
  }, [attemptedKey, cameraCanAskAgain, cameraGranted, cameraStatus, steps]);

  useEffect(() => {
    if (!recordReady) return;
    let cancelled = false;
    const camera =
      cameraGranted === undefined
        ? null
        : {
            granted: cameraGranted,
            canAskAgain: cameraCanAskAgain ?? true,
            status: cameraStatus ?? 'undetermined',
          };
    const attempted = new Set(attemptedKey.split(',').filter(Boolean) as PermissionId[]);
    void readPermissions(steps, attempted, camera).then((next) => {
      if (cancelled) return;
      setSnapshot((prev) => ({ ...prev, ...next }));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [attemptedKey, cameraCanAskAgain, cameraGranted, cameraStatus, recordReady, steps]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const advance = useCallback(() => {
    const next = indexRef.current + 1;
    if (next >= stepsRef.current.length) close();
    else setIndex(next);
  }, [close]);

  const takeWaiting = (id: PermissionId) => {
    if (waiting.current !== id) return false;
    waiting.current = null;
    return true;
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const id = waiting.current;
      void (async () => {
        if (id) await markAttempted(id);
        const next = await refresh();
        if (id && next[id]?.outcome === 'granted' && takeWaiting(id)) {
          await markSeen(id);
          advance();
        }
      })();
    });
    return () => sub.remove();
  }, [advance, markAttempted, markSeen, refresh]);

  if (loaded && !placed) {
    const pending = firstPendingIndex(
      steps,
      Object.fromEntries(steps.map((id) => [id, snapshot[id]?.outcome ?? 'undetermined'])),
      new Set(record.seen),
    );
    setPlaced(true);
    setIndex(pending < 0 ? steps.length : pending);
  }

  const current = activeStep(steps, index);
  const currentSnap = current ? snapshot[current] : null;

  if (!placed) {
    return (
      <Screen tabPadding={false}>
        <BrandMark />
      </Screen>
    );
  }

  const onRequest = async () => {
    if (!current || busy) return;
    setBusy(true);
    waiting.current = current;
    try {
      if (current === 'camera') await requestCamera();
      else await requestPermission(current);
      const next = await refresh();
      if (next[current]?.outcome === 'granted' && takeWaiting(current)) {
        await markSeen(current);
        advance();
      }
    } finally {
      setBusy(false);
    }
  };

  const onOpenSettings = async () => {
    if (!current || busy) return;
    waiting.current = current;
    await markAttempted(current);
    await openPermissionSettings(current);
  };

  const onContinue = async () => {
    if (!current) return;
    await markSeen(current);
    advance();
  };

  if (!current || !currentSnap) {
    return (
      <Screen tabPadding={false} scroll>
        <BrandMark />
        <Text style={styles.title}>{t('permissions.doneTitle')}</Text>
        <Text style={styles.body}>{t('permissions.doneBody')}</Text>
        <View style={styles.actions}>
          <PrimaryButton label={t('permissions.doneButton')} onPress={close} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tabPadding={false} scroll>
      <BrandMark />
      <DeviceOnlyNotice notice="preview" />
      <View style={styles.explainer}>
        <PermissionExplainer
          id={current}
          outcome={currentSnap.outcome}
          canAskAgain={currentSnap.canAskAgain}
          busy={busy || !loaded}
          index={index}
          total={steps.length}
          onRequest={() => {
            void onRequest();
          }}
          onOpenSettings={() => {
            void onOpenSettings();
          }}
          onContinue={() => {
            void onContinue();
          }}
          onSkip={() => {
            if (index + 1 >= steps.length) close();
            else setIndex(index + 1);
          }}
        />
        <PrimaryButton
          muted
          label={t('common.back')}
          onPress={() => {
            if (index <= 0) close();
            else setIndex(index - 1);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Type.displayL,
    marginTop: 18,
    color: Palette.ink,
  },
  body: {
    ...Type.bodyL,
    marginTop: 12,
    color: Palette.muted,
  },
  actions: {
    marginTop: 28,
  },
  explainer: {
    flex: 1,
    marginTop: 18,
    gap: 10,
  },
});
