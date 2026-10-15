import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo, type NfcScope } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { NFC_FAILURE_KEY } from '@/lib/nfc-failure-key';

type Props = {
  scope: NfcScope | readonly NfcScope[];
  onRetry?: () => void;
};

export function NfcNotice({ scope, onRetry }: Props) {
  const { t } = useI18n();
  const { nfcNotice, nfcActivity, openNfcSettings } = useTiempo();
  const scopes = Array.isArray(scope) ? scope : [scope];
  const active = nfcActivity && scopes.includes(nfcActivity.scope) ? nfcActivity : null;
  if (active) {
    const message =
      active.phase === 'confirm'
        ? t('nfc.confirming')
        : active.phase === 'auth'
          ? t('nfc.authorizing')
          : active.phase === 'writing'
            ? t('nfc.writing')
            : t('nfc.scanning');
    return (
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.box, styles.active]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    );
  }

  if (!nfcNotice || !scopes.includes(nfcNotice.scope)) return null;
  const notice = nfcNotice;

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.box, styles.error]}>
      <Text style={styles.text}>
        {Platform.OS === 'web' && notice.error === 'unsupported'
          ? t('deviceOnly.nfc')
          : t(NFC_FAILURE_KEY[notice.error])}
      </Text>
      {notice.error === 'disabled' ? (
        <PrimaryButton muted label={t('nfc.openSettings')} onPress={() => void openNfcSettings()} />
      ) : null}
      {onRetry ? <PrimaryButton muted label={t('nfc.retry')} onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  active: {
    borderColor: 'rgba(212,146,58,0.45)',
    backgroundColor: Palette.accentSoft,
  },
  error: {
    borderColor: 'rgba(224,112,96,0.45)',
    backgroundColor: Palette.dangerSoft,
  },
  text: {
    ...Type.body,
    color: Palette.ink,
  },
});
