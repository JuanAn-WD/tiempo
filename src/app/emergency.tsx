import { useFonts } from 'expo-font';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { EMERGENCY_COUNTDOWN_MS, formatCountdown, formatRefillDate } from '@/lib/emergency';

const HOLD_MS = 500;
const MAX_TICK_MS = 2_000;
const EMERGENCY_KEEP_AWAKE = 'apartag-emergency-countdown';

type Phase = 'idle' | 'running' | 'ready' | 'confirming' | 'cancelled' | 'done';

export default function EmergencyScreen() {
  const router = useRouter();
  const { state, emergencyUnlock, pairTag, clockSkewed } = useTiempo();
  const { locale, t } = useI18n();
  const [fontsLoaded] = useFonts({ JetBrainsMono_500Medium });
  const [phase, setPhase] = useState<Phase>('idle');
  const [remain, setRemain] = useState(EMERGENCY_COUNTDOWN_MS);
  const [pairError, setPairError] = useState(false);
  const monoRef = useRef(0);
  const remainRef = useRef(EMERGENCY_COUNTDOWN_MS);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('idle');

  const cancel = useCallback(() => {
    const current = phaseRef.current;
    if (current !== 'running' && current !== 'ready') return;
    phaseRef.current = 'cancelled';
    remainRef.current = EMERGENCY_COUNTDOWN_MS;
    setPhase('cancelled');
    setRemain(EMERGENCY_COUNTDOWN_MS);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') cancel();
    });
    let removeVis: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVis = () => {
        if (document.visibilityState !== 'visible') cancel();
      };
      document.addEventListener('visibilitychange', onVis);
      removeVis = () => document.removeEventListener('visibilitychange', onVis);
    }
    return () => {
      sub?.remove();
      removeVis?.();
      if (holdRef.current) clearTimeout(holdRef.current);
    };
  }, [cancel]);

  useEffect(() => {
    const awake = phase === 'running' || phase === 'ready' || phase === 'confirming';
    if (!awake) return;
    // Stops the OS auto-lock from moving AppState off `active` and cancelling the wait.
    // Leaving the app still cancels: keep-awake does not hold a background session.
    void activateKeepAwakeAsync(EMERGENCY_KEEP_AWAKE).catch(() => {});
    return () => {
      void deactivateKeepAwake(EMERGENCY_KEEP_AWAKE).catch(() => {});
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    monoRef.current = monotonicSample();
    const id = setInterval(() => {
      if (phaseRef.current !== 'running') return;
      const mono = monotonicSample();
      const delta = Math.min(MAX_TICK_MS, Math.max(0, mono - monoRef.current));
      monoRef.current = mono;
      const next = Math.max(0, remainRef.current - delta);
      remainRef.current = next;
      setRemain(next);
      if (next <= 0) {
        phaseRef.current = 'ready';
        setPhase('ready');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  const start = useCallback(() => {
    if (phaseRef.current === 'running' || phaseRef.current === 'ready' || phaseRef.current === 'confirming') {
      return;
    }
    if (!state.locked || state.strict || state.emergencyLeft <= 0) return;
    if (AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    remainRef.current = EMERGENCY_COUNTDOWN_MS;
    setRemain(EMERGENCY_COUNTDOWN_MS);
    monoRef.current = monotonicSample();
    phaseRef.current = 'running';
    setPhase('running');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [state.emergencyLeft, state.locked, state.strict]);

  const clearHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const confirm = async () => {
    if (phaseRef.current !== 'ready') return;
    phaseRef.current = 'confirming';
    setPhase('confirming');
    const ok = await emergencyUnlock();
    if (!ok) {
      phaseRef.current = 'ready';
      setPhase('ready');
      return;
    }
    phaseRef.current = 'done';
    setPhase('done');
  };

  const pairReplacement = async () => {
    setPairError(false);
    const paired = await pairTag();
    if (paired) {
      router.replace('/');
      return;
    }
    setPairError(true);
  };

  const blocked = !state.locked && phase !== 'done' && phase !== 'confirming';
  const unavailable = state.strict || state.emergencyLeft <= 0;

  return (
    <Screen tabPadding={false} atmosphere="idle">
      <BrandMark size={20} />
      <Text style={styles.kicker}>{t('emergency.kicker')}</Text>
      <Text style={styles.title}>{t('emergency.title')}</Text>
      <Text style={styles.body}>{state.strict ? t('emergency.strict') : t('emergency.body')}</Text>

      <View style={styles.clockWrap}>
        <Text
          style={[styles.clock, fontsLoaded && styles.clockFont]}
          accessibilityLabel={t('emergency.countdown', {
            time: formatCountdown(phase === 'idle' || phase === 'cancelled' ? EMERGENCY_COUNTDOWN_MS : remain),
          })}>
          {formatCountdown(phase === 'idle' || phase === 'cancelled' ? EMERGENCY_COUNTDOWN_MS : remain)}
        </Text>
        <Text style={styles.clockHint}>
          {phase === 'running'
            ? t('emergency.stay')
            : phase === 'ready'
              ? t('emergency.ready')
              : phase === 'cancelled'
                ? t('emergency.cancelled')
                : phase === 'confirming'
                  ? t('emergency.unlocking')
                  : phase === 'done'
                    ? t('emergency.saved')
                    : t('emergency.left', { count: state.emergencyLeft })}
        </Text>
      </View>

      <View style={styles.actions}>
        {phase === 'done' ? (
          <>
            <Text style={styles.note}>{t('emergency.lost')}</Text>
            {pairError ? <Text style={styles.note}>{t('emergency.pairFail')}</Text> : null}
            <PrimaryButton label={t('emergency.pair')} onPress={() => void pairReplacement()} />
            <PrimaryButton muted label={t('emergency.notNow')} onPress={() => router.replace('/')} />
          </>
        ) : blocked ? (
          <Text style={styles.note}>{t('emergency.noLock')}</Text>
        ) : unavailable ? (
          <Text style={styles.note}>
            {state.strict
              ? t('emergency.off')
              : clockSkewed
                ? t('emergency.clockSkew')
                : state.emergencyRefillAt
                  ? t('emergency.refill', { date: formatRefillDate(state.emergencyRefillAt, locale) })
                  : t('emergency.none')}
          </Text>
        ) : phase === 'ready' || phase === 'confirming' ? (
          <PrimaryButton
            danger
            label={t('emergency.confirm')}
            accessibilityHint={t('emergency.confirmHint')}
            disabled={phase === 'confirming'}
            onPress={() => void confirm()}
          />
        ) : phase === 'running' ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('emergency.hold')}
            accessibilityHint={t('emergency.holdHint')}
            accessibilityActions={[{ name: 'longpress', label: t('emergency.holdAction') }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'longpress') start();
            }}
            onLongPress={start}
            delayLongPress={HOLD_MS}
            onPressIn={() => {
              clearHold();
              holdRef.current = setTimeout(start, HOLD_MS);
            }}
            onPressOut={clearHold}
            style={({ pressed }) => [styles.hold, pressed && styles.holdPressed]}>
            <View style={styles.holdDot} />
            <Text style={styles.holdLabel}>{t('emergency.hold')}</Text>
          </Pressable>
        )}

        {phase === 'done' ? null : phase === 'running' ? (
          <PrimaryButton muted label={t('common.cancel')} onPress={cancel} />
        ) : (
          <PrimaryButton muted label={t('common.back')} onPress={leave} />
        )}
      </View>
    </Screen>
  );
}

function monotonicSample() {
  const clock = globalThis.performance;
  if (clock && typeof clock.now === 'function') return clock.now();
  return 0;
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: 22,
    color: Palette.danger,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 40,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -1,
  },
  body: {
    marginTop: 10,
    color: Palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  clockWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  clock: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontVariant: ['tabular-nums'],
    fontSize: 72,
    lineHeight: 80,
    color: Palette.danger,
    fontWeight: '500',
    letterSpacing: -2,
  },
  clockFont: {
    fontFamily: 'JetBrainsMono_500Medium',
  },
  clockHint: {
    color: Palette.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  actions: {
    gap: 10,
    marginBottom: 8,
  },
  note: {
    textAlign: 'center',
    color: Palette.danger,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  hold: {
    minHeight: 54,
    paddingVertical: 17,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(224,112,96,0.45)',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  holdPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  holdDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.danger,
  },
  holdLabel: {
    color: Palette.danger,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
