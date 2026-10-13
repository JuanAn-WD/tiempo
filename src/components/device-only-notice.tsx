import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Palette, Radius, Type } from '@/constants/theme';
import { useI18n, type TranslationKey } from '@/i18n';

const NOTICE_KEY = {
  preview: 'deviceOnly.preview',
  nfc: 'deviceOnly.nfc',
  blocker: 'deviceOnly.blocker',
  usage: 'deviceOnly.usage',
  purchases: 'deviceOnly.purchases',
  review: 'deviceOnly.review',
} as const satisfies Record<string, TranslationKey>;

export type DeviceOnlyNoticeId = keyof typeof NOTICE_KEY;

/**
 * Shown on the web preview so a native feature explains itself instead of
 * failing. Renders nothing on iOS and Android.
 */
export function DeviceOnlyNotice({ notice }: { notice: DeviceOnlyNoticeId }) {
  const { t } = useI18n();
  if (Platform.OS !== 'web') return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.box}>
      <Text style={styles.text}>{t(NOTICE_KEY[notice])}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(212,146,58,0.45)',
    backgroundColor: Palette.accentSoft,
    padding: 12,
    marginTop: 12,
  },
  text: {
    ...Type.body,
    color: Palette.ink,
  },
});
