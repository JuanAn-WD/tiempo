import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Palette, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { formatRefillDate } from '@/lib/emergency';

export function EmergencyEntry({ strictNote = false }: { strictNote?: boolean }) {
  const router = useRouter();
  const { state, clockSkewed } = useTiempo();
  const { locale, t } = useI18n();

  if (!state.locked) return null;

  if (state.strict) {
    if (!strictNote) return null;
    return <Text style={styles.note}>{t('blocked.strictNote')}</Text>;
  }

  const left = state.emergencyLeft;

  return (
    <View style={styles.wrap}>
      <PrimaryButton
        muted
        danger
        disabled={left <= 0}
        label={t('emergency.button', { count: left })}
        accessibilityHint={t('emergency.buttonHint')}
        onPress={() => router.push('/emergency')}
      />
      {left <= 0 ? (
        <Text style={styles.note}>
          {clockSkewed
            ? t('emergency.clockSkew')
            : state.emergencyRefillAt
              ? t('emergency.refill', { date: formatRefillDate(state.emergencyRefillAt, locale) })
              : t('emergency.none')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  note: {
    ...Type.caption,
    textAlign: 'center',
    color: Palette.danger,
  },
});
