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
  /**
   * Raised banner with its own solid surface. The focus screen uses this so
   * the “hold the tag” hint stays readable above the mode cards.
   */
  prominent?: boolean;
};

export function NfcNotice({ scope, onRetry, prominent = false }: Props) {
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
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.box, styles.active, prominent && styles.prominent, prominent && styles.prominentActive]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    );
  }

  if (!nfcNotice || !scopes.includes(nfcNotice.scope)) return null;
  const notice = nfcNotice;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, styles.error, prominent && styles.prominent, prominent && styles.prominentError]}>
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
  /**
   * Sits in normal flow (callers reserve the height) and above siblings that
   * would otherwise paint over an overflowing hint. Solid fills stay readable
   * on both the idle and focus backgrounds.
   */
  prominent: {
    zIndex: 30,
    elevation: 24,
    width: '100%',
    flexShrink: 0,
    marginTop: 12,
    shadowColor: Palette.black,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  prominentActive: {
    backgroundColor: Palette.bgElevated,
    borderColor: 'rgba(110,231,176,0.55)',
  },
  prominentError: {
    backgroundColor: Palette.bgElevated,
    borderColor: 'rgba(224,112,96,0.55)',
  },
  text: {
    ...Type.body,
    color: Palette.ink,
    flexShrink: 1,
  },
});
