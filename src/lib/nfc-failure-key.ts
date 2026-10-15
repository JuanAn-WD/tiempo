import type { TranslationKey } from '@/i18n/translate';
import type { NfcFailure } from '@/lib/nfc-types';

export const NFC_FAILURE_KEY: Record<NfcFailure, TranslationKey> = {
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
  'read-only': 'nfc.failure.readOnly',
  'not-ndef': 'nfc.failure.notNdef',
};
