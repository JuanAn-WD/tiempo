import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo, type NfcScope } from '@/context/tiempo-store';
import { useI18n, type TranslationKey } from '@/i18n';
import type { NfcFailure } from '@/lib/nfc-types';

const FAILURE_KEY: Record<NfcFailure, TranslationKey> = {
  unsupported: 'nfc.failure.unsupported',
  disabled: 'nfc.failure.disabled',
  cancelled: 'nfc.failure.cancelled',
  timeout: 'nfc.failure.timeout',
  'no-tag': 'nfc.failure.noTag',
  unstable: 'nfc.failure.unstable',
  mismatch: 'nfc.failure.mismatch',
  session: 'nfc.failure.session',
  unknown: 'nfc.failure.unknown',
  'wrong-tag': 'nfc.failure.wrongTag',
  'same-as-primary': 'nfc.failure.sameAsPrimary',
  'same-as-spare': 'nfc.failure.sameAsSpare',
  'need-primary': 'nfc.failure.needPrimary',
  'auth-failed': 'nfc.failure.authFailed',
  'no-paired-tag': 'nfc.failure.noPairedTag',
};

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
          : t(FAILURE_KEY[notice.error])}
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
