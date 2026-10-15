import { useRouter } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Palette, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';

/**
 * iOS only. `apartag://tag` can open this screen because iOS cannot toggle
 * in the background. Android handles the same link in NfcTapActivity and
 * never routes here.
 */
export default function TagLaunchScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { launcherFeedback } = useTiempo();
  const message =
    launcherFeedback?.message ?? (Platform.OS === 'web' ? t('deviceOnly.nfc') : t('nfc.tap.checking'));

  return (
    <Screen tabPadding={false}>
      <Text style={styles.kicker}>{t('tabs.focus')}</Text>
      <Text style={styles.title}>{message}</Text>
      <PrimaryButton muted label={t('common.back')} onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...Type.kicker,
    marginTop: 22,
    color: Palette.accentBright,
  },
  title: {
    ...Type.displayL,
    marginTop: 10,
    marginBottom: 24,
    color: Palette.ink,
  },
});
