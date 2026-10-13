import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Pulse QR for the mobile key.
 *
 * Pairing stays v1: the QR still carries the shared secret in the clear, and
 * phones that already stored that secret keep it. New pairing QRs add
 * `alg: "hmac-sha256"`; old ones omit it and are accepted the same way.
 *
 * Each unlock QR is v2. The stored secret string is the HMAC-SHA256 key
 * (UTF-8, not hex-decoded, so an already-paired secret still matches).
 * `n` is a 128-bit nonce. The locked phone remembers accepted nonces so the
 * same QR cannot be scanned twice during the time it would still be fresh.
 *
 * A v1 pulse (SHA-256 of `secret:ts`, truncated) is recognized and refused.
 * The other phone needs an update; it does not need to pair again.
 */

export const PULSE_TTL_MS = 60_000;

/** How far apart the two phones' clocks can be and still use the full minute. */
export const PULSE_SKEW_MS = 30_000;

/** How long a spent nonce is remembered, including across a clock step. */
export const NONCE_RETENTION_MS = 24 * 60 * 60 * 1000;

export const MOBILE_KEY_ALG = 'hmac-sha256' as const;

const NONCE_RE = /^[0-9a-f]{32}$/;
const SIG_RE = /^[0-9a-f]{64}$/;
const MAX_REMEMBERED_NONCES = 128;

export type PairPayload = {
  v: 1;
  t: 'pair';
  s: string;
  n?: string;
  alg?: typeof MOBILE_KEY_ALG;
};

export type PulsePayload = {
  v: 2;
  t: 'pulse';
  ts: number;
  n: string;
  sig: string;
};

export type LegacyPulsePayload = {
  v: 1;
  t: 'pulse';
  ts: number;
  sig: string;
  legacy: true;
};

export type KeyPayload = PairPayload | PulsePayload | LegacyPulsePayload;

export type UsedPulseNonce = {
  n: string;
  /** Wall-clock time after which this nonce can be forgotten. */
  exp: number;
};

export type PulseFailure = 'expired' | 'skew' | 'bad-signature' | 'replay' | 'legacy' | 'malformed';

export type PulseVerdict =
  | { ok: true; nonce: string; ts: number }
  | { ok: false; reason: PulseFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function hmacSha256Hex(key: Uint8Array, message: Uint8Array) {
  return bytesToHex(hmac(sha256, key, message));
}

function pulseMessage(ts: number, nonce: string) {
  return utf8ToBytes(`apartag.pulse.v2:${ts}:${nonce}`);
}

export function signPulse(secret: string, ts: number, nonce: string) {
  return hmacSha256Hex(utf8ToBytes(secret), pulseMessage(ts, nonce));
}

export function buildPairPayload(secret: string, name?: string) {
  const payload: PairPayload = { v: 1, t: 'pair', s: secret, alg: MOBILE_KEY_ALG };
  if (name) payload.n = name;
  return JSON.stringify(payload);
}

export function buildPulsePayload(secret: string, ts: number, nonce: string) {
  const payload: PulsePayload = {
    v: 2,
    t: 'pulse',
    ts,
    n: nonce,
    sig: signPulse(secret, ts, nonce),
  };
  return JSON.stringify(payload);
}

export function parseKeyPayload(raw: string): KeyPayload | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return null;
    if (data.t === 'pair' && data.v === 1) {
      if (typeof data.s !== 'string' || data.s.length === 0) return null;
      if (data.alg !== undefined && data.alg !== MOBILE_KEY_ALG) return null;
      const payload: PairPayload = { v: 1, t: 'pair', s: data.s };
      if (typeof data.n === 'string' && data.n.length > 0) payload.n = data.n;
      if (data.alg === MOBILE_KEY_ALG) payload.alg = MOBILE_KEY_ALG;
      return payload;
    }
    if (data.t === 'pulse' && data.v === 1) {
      if (typeof data.ts !== 'number' || typeof data.sig !== 'string' || data.sig.length === 0) return null;
      return { v: 1, t: 'pulse', ts: data.ts, sig: data.sig, legacy: true };
    }
    if (data.t === 'pulse' && data.v === 2) {
      if (typeof data.ts !== 'number' || !Number.isSafeInteger(data.ts) || data.ts <= 0) return null;
      if (typeof data.n !== 'string' || !NONCE_RE.test(data.n)) return null;
      if (typeof data.sig !== 'string' || !SIG_RE.test(data.sig)) return null;
      return { v: 2, t: 'pulse', ts: data.ts, n: data.n, sig: data.sig };
    }
    return null;
  } catch {
    return null;
  }
}

export function pulseWindow(ts: number, now: number): 'ok' | 'expired' | 'skew' {
  if (!Number.isSafeInteger(ts) || !Number.isSafeInteger(now)) return 'expired';
  if (ts > now + PULSE_SKEW_MS) return 'skew';
  if (now - ts > PULSE_TTL_MS + PULSE_SKEW_MS) return 'expired';
  return 'ok';
}

export function verifyPulse(
  payload: PulsePayload | LegacyPulsePayload,
  expectedSecret: string,
  options?: { now?: number; usedNonces?: readonly { n: string }[] },
): PulseVerdict {
  if (payload.v === 1) return { ok: false, reason: 'legacy' };
  if (!expectedSecret) return { ok: false, reason: 'bad-signature' };
  const now = options?.now ?? Date.now();
  const window = pulseWindow(payload.ts, now);
  if (window !== 'ok') return { ok: false, reason: window };
  const expected = signPulse(expectedSecret, payload.ts, payload.n);
  if (!timingSafeEqualHex(expected, payload.sig)) return { ok: false, reason: 'bad-signature' };
  if (options?.usedNonces?.some((item) => item.n === payload.n)) {
    return { ok: false, reason: 'replay' };
  }
  return { ok: true, nonce: payload.n, ts: payload.ts };
}

export function pruneUsedNonces(list: readonly UsedPulseNonce[], now: number, lastSeenAt = 0) {
  const kept = now < lastSeenAt ? list : list.filter((item) => now <= item.exp);
  return kept.slice(-MAX_REMEMBERED_NONCES);
}

export function rememberNonce(
  list: readonly UsedPulseNonce[],
  nonce: string,
  ts: number,
  now: number,
  lastSeenAt = 0,
) {
  const exp = Math.max(ts + PULSE_TTL_MS + PULSE_SKEW_MS, now + NONCE_RETENTION_MS);
  const next = list.some((item) => item.n === nonce) ? list : [...list, { n: nonce, exp }];
  return pruneUsedNonces(next, now, lastSeenAt);
}

export function sanitizeUsedNonces(raw: unknown, now: number, lastSeenAt = 0): UsedPulseNonce[] {
  if (!Array.isArray(raw)) return [];
  const items: UsedPulseNonce[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    if (typeof item.n !== 'string' || !NONCE_RE.test(item.n)) continue;
    if (typeof item.exp !== 'number' || !Number.isFinite(item.exp)) continue;
    items.push({ n: item.n, exp: item.exp });
  }
  return pruneUsedNonces(items, now, lastSeenAt);
}
