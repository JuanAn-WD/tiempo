import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { DeviceOnlyNotice } from '@/components/device-only-notice';
import { EmergencyEntry } from '@/components/emergency-entry';
import { FocusOrb } from '@/components/focus-orb';
import { NfcNotice } from '@/components/nfc-notice';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Badge, BrandMark, StatTile } from '@/components/ui';
import { FontFamily, Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { usePermissionRecord } from '@/lib/permission-ack';
import { formatClock, formatDuration, MODES } from '@/lib/storage';

export default function FocusScreen() {
  const router = useRouter();
  const { state, toggleLockWithTag, setMode, refreshEmergencyClock } = useTiempo();
  const { record, ready: permissionsReady } = usePermissionRecord();
  const nfcExplained = permissionsReady && record.seen.includes('nfc');
  const scanTag = () => {
    if (!nfcExplained) {
      router.push('/permissions?scope=nfc');
      return;
    }
    void toggleLockWithTag(false);
  };
  const { locale, t } = useI18n();
  const [clock, setClock] = useState<{ at: number; ms: number } | null>(null);

  useEffect(() => {
    if (!state.locked || !state.lockedAt) return;
    const startedAt = state.lockedAt;
    const id = setInterval(() => {
      setClock({ at: startedAt, ms: Date.now() - startedAt });
    }, 1000);
    return () => clearInterval(id);
  }, [state.locked, state.lockedAt]);

  const sessionMs =
    state.locked && state.lockedAt && clock?.at === state.lockedAt ? clock.ms : 0;
  const mode = MODES.find((item) => item.id === state.mode);

  useFocusEffect(
    useCallback(() => {
      void refreshEmergencyClock();
    }, [refreshEmergencyClock]),
  );

  const hint = useMemo(() => {
    const action = state.locked ? t('focus.hintUnlock') : t('focus.hintLock');
    if (__DEV__) return t('focus.hintDev', { action });
    return action;
  }, [state.locked, t]);

  return (
    <Screen atmosphere={state.locked ? 'focus' : 'idle'}>
      <View style={styles.topBar}>
        <BrandMark size={20} />
        <Badge
          label={state.locked ? t('focus.badgeFocus') : t('focus.badgeReady')}
          tone={state.locked ? 'focus' : 'accent'}
        />
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.kicker}>{state.locked ? (mode ? t(mode.titleKey) : t('focus.session')) : t('focus.presence')}</Text>
        <Text style={styles.title}>
          {state.locked ? t('focus.titleLocked') : t('focus.titleIdle')}
        </Text>
      </View>

      <View style={styles.orbArea}>
        <FocusOrb
          locked={state.locked}
          hint={hint}
          clock={state.locked ? formatClock(sessionMs) : undefined}
          onPress={scanTag}
          onLongPress={__DEV__ ? () => void toggleLockWithTag(true) : undefined}
        />
        <NfcNotice scope="toggle" onRetry={scanTag} />
        <DeviceOnlyNotice notice="nfc" />
      </View>

      <View style={styles.modeGrid}>
        {MODES.map((item) => {
          const on = item.id === state.mode;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setMode(item.id)}
              style={[styles.modeCard, on && (state.locked ? styles.modeCardFocus : styles.modeCardOn)]}>
              <View style={[styles.modeMark, on && styles.modeMarkOn]}>
                <Text style={[styles.modeMarkText, on && styles.modeMarkTextOn]}>{item.mark}</Text>
              </View>
              <Text style={[styles.modeTitle, on && styles.modeTitleOn]}>{t(item.titleKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <StatTile
          emphasize={!state.locked}
          value={formatDuration(state.locked ? sessionMs : state.recoveredMs, locale)}
          label={state.locked ? t('focus.statSession') : t('focus.statReclaimed')}
        />
        <StatTile
          value={state.mobileKeySecret ? t('common.on') : t('common.dash')}
          label={t('focus.statPhoneKey')}
        />
      </View>

      <PrimaryButton
        label={state.locked ? t('focus.scanKey') : t('focus.lockWithKey')}
        onPress={() => router.push('/scan-key')}
      />
      {state.locked ? (
        <View style={styles.emergency}>
          <EmergencyEntry />
        </View>
      ) : null}
      <Text style={styles.footer}>
        {state.strict
          ? t('focus.footerStrict')
          : t('focus.footerNormal', { count: state.emergencyLeft })}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroCopy: {
    marginBottom: 8,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.muted,
    letterSpacing: 1.8,
  },
  title: {
    ...Type.displayL,
    marginTop: 8,
    color: Palette.ink,
  },
  orbArea: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 300,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modeCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeCardOn: {
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.45)',
  },
  modeCardFocus: {
    backgroundColor: Palette.focusSoft,
    borderColor: 'rgba(110,231,176,0.4)',
  },
  modeMark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgElevated,
  },
  modeMarkOn: {
    backgroundColor: Palette.accent,
  },
  modeMarkText: {
    fontFamily: FontFamily.uiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Palette.faintText,
  },
  modeMarkTextOn: {
    color: Palette.accentText,
  },
  modeTitle: {
    fontFamily: FontFamily.uiBold,
    fontSize: 14,
    lineHeight: 18,
    color: Palette.muted,
  },
  modeTitleOn: {
    color: Palette.ink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  emergency: {
    marginTop: 10,
  },
  footer: {
    ...Type.caption,
    textAlign: 'center',
    color: Palette.faintText,
    letterSpacing: 0.2,
    paddingVertical: 10,
  },
});
