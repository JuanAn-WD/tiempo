/** Failures the NFC layer can surface. Copy for each one lives in the i18n catalogs. */
export const NFC_FAILURES = [
  'unsupported',
  'disabled',
  'cancelled',
  'timeout',
  'no-tag',
  'unstable',
  'mismatch',
  'session',
  'unknown',
  'wrong-tag',
  'same-as-primary',
  'same-as-spare',
  'need-primary',
  'auth-failed',
  'no-paired-tag',
  'read-only',
  'not-ndef',
] as const;

export type NfcFailure = (typeof NFC_FAILURES)[number];

export type NfcRead =
  | { ok: true; id: string }
  | { ok: false; error: NfcFailure };

export type NfcRadioStatus = {
  supported: boolean;
  enabled: boolean;
};
