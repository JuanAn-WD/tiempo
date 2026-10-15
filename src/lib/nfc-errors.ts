import type { NfcFailure } from '@/lib/nfc-types';

const IOS_CODE: Record<number, NfcFailure> = {
  1: 'unsupported',
  6: 'disabled',
  103: 'session',
  200: 'cancelled',
  201: 'timeout',
  203: 'session',
  400: 'read-only',
  402: 'not-ndef',
};

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return '';
}

/** Map native NFC exceptions to a failure the UI can retry or explain. */
export function classifyNfcError(error: unknown): NfcFailure {
  const text = errorText(error);
  const blob = text.toLowerCase();

  const ios = blob.match(/nfcerror:(-?\d+)/);
  if (ios) {
    const code = Number(ios[1]);
    const mapped = IOS_CODE[code];
    if (mapped) return mapped;
  }

  if (blob.includes('usercancel') || blob.includes('user cancel') || blob.includes('cancelled') || blob.includes('canceled')) {
    return 'cancelled';
  }
  if (blob.includes('nfc-timeout') || blob.includes('timeout')) return 'timeout';
  if (blob.includes('radiodisabled') || blob.includes('radio disabled') || blob.includes('not enabled') || blob.includes('nfc is disabled')) {
    return 'disabled';
  }
  if (
    blob.includes('not support') ||
    blob.includes('no nfc support') ||
    blob.includes('unsupportedfeature') ||
    blob.includes('unsupported')
  ) {
    return 'unsupported';
  }
  if (
    blob.includes('duplicated registration') ||
    blob.includes('systembusy') ||
    blob.includes('system busy') ||
    blob.includes('sessioninvalidated') ||
    blob.includes('one request at a time') ||
    blob.includes('no active session') ||
    blob.includes('not even registered')
  ) {
    return 'session';
  }
  if (blob.includes('no reference') || blob.includes('no tech request')) return 'no-tag';
  if (
    blob.includes('not writable') ||
    blob.includes('not writeable') ||
    blob.includes('read-only') ||
    blob.includes('readonly') ||
    blob.includes('read only') ||
    blob.includes('tagnotwritable')
  ) {
    return 'read-only';
  }
  if (
    blob.includes('not formattable') ||
    blob.includes('not ndef') ||
    blob.includes('no ndef') ||
    blob.includes('ndef format') ||
    blob.includes('fail to apply ndef')
  ) {
    return 'not-ndef';
  }
  return 'unknown';
}
