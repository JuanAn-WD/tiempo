import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmergencyEntry } from '@/components/emergency-entry';
import { Text } from '@/components/app-text';
import { FocusOrb } from '@/components/focus-orb';
import { NfcNotice } from '@/components/nfc-notice';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { usePermissionRecord } from '@/lib/permission-ack';

export default function BlockedScreen() {
  const { app } = useLocalSearchParams<{ app?: string }>();
  const router = useRouter();
  const { toggleLockWithTag, state, refreshEmergencyClock } = useTiempo();
  const { record, ready: permissionsReady } = usePermissionRecord();
  const { t } = useI18n();
  const nfcExplained = permissionsReady && record.seen.includes('nfc');
  const scanTag = () => {
    if (!nfcExplained) {
      router.push('/permissions?scope=nfc');
      return;
    }
    void toggleLockWithTag(false);
  };
  const name = app ? decodeURIComponent(String(app)) : t('blocked.fallbackApp');

  useFocusEffect(
    useCallback(() => {
      void refreshEmergencyClock();
      if (!state.locked) router.replace('/');
    }, [refreshEmergencyClock, router, state.locked]),
  );

  return (
    <Screen tabPadding={false} atmosphere={state.locked ? 'focus' : 'idle'}>
      <BrandMark size={20} />
      <Text style={[styles.kicker, !state.locked && { color: Palette.accentBright }]}>
        {state.locked ? t('blocked.locked') : t('blocked.unlocked')}
      </Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.body}>
        {state.locked ? (state.strict ? t('blocked.strict') : t('blocked.normal')) : t('blocked.done')}
      </Text>

      <View style={styles.tag}>
        <FocusOrb
          locked={state.locked}
          hint={
            state.locked ? (__DEV__ ? t('blocked.hintDev') : t('blocked.hint')) : t('blocked.closed')
          }
          onPress={scanTag}
          onLongPress={__DEV__ ? () => void toggleLockWithTag(true) : undefined}
        />
        <NfcNotice scope="toggle" onRetry={scanTag} />
      </View>

      <View style={styles.actions}>
        {state.locked ? (
          <PrimaryButton label={t('blocked.scan')} onPress={() => router.push('/scan-key')} />
        ) : null}
        <EmergencyEntry strictNote />
        <PrimaryButton muted label={t('blocked.back')} onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...Type.kicker,
    marginTop: 22,
    color: Palette.focus,
    letterSpacing: 1.8,
  },
  title: {
    ...Type.displayL,
    marginTop: 10,
    color: Palette.ink,
  },
  body: {
    ...Type.bodyL,
    marginTop: 10,
    color: Palette.muted,
  },
  tag: {
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: 10,
    marginBottom: 8,
  },
});
