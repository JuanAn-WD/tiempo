import * as Crypto from 'expo-crypto';

import { buildPulsePayload as encodePulse } from '@/lib/mobile-key-mac';

export {
  MOBILE_KEY_ALG,
  NONCE_RETENTION_MS,
  PULSE_SKEW_MS,
  PULSE_TTL_MS,
  buildPairPayload,
  parseKeyPayload,
  rememberNonce,
  sanitizeUsedNonces,
  verifyPulse,
} from '@/lib/mobile-key-mac';

export type {
  KeyPayload,
  LegacyPulsePayload,
  PairPayload,
  PulsePayload,
  PulseVerdict,
  UsedPulseNonce,
} from '@/lib/mobile-key-mac';

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createMobileKeySecret() {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return toHex(bytes);
}

/** Live QR. `now` is written into the payload so the countdown matches the signature. */
export async function buildPulsePayload(secret: string, now = Date.now()) {
  const nonce = toHex(await Crypto.getRandomBytesAsync(16));
  return encodePulse(secret, now, nonce);
}
