import * as Crypto from 'expo-crypto';

export type PairPayload = {
  v: 1;
  t: 'pair';
  s: string;
  n?: string;
};

export type PulsePayload = {
  v: 1;
  t: 'pulse';
  ts: number;
  sig: string;
};

export type KeyPayload = PairPayload | PulsePayload;

const PULSE_TTL_MS = 60_000;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createMobileKeySecret() {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return toHex(bytes);
}

async function sign(secret: string, ts: number) {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${secret}:${ts}`,
  );
  return digest.slice(0, 24);
}

export async function buildPairPayload(secret: string, name?: string): Promise<string> {
  const payload: PairPayload = { v: 1, t: 'pair', s: secret, n: name };
  return JSON.stringify(payload);
}

export async function buildPulsePayload(secret: string): Promise<string> {
  const ts = Date.now();
  const sig = await sign(secret, ts);
  const payload: PulsePayload = { v: 1, t: 'pulse', ts, sig };
  return JSON.stringify(payload);
}

export function parseKeyPayload(raw: string): KeyPayload | null {
  try {
    const data = JSON.parse(raw) as Partial<KeyPayload> & { s?: string };
    if (data?.v !== 1 || !data.t) return null;
    if (data.t === 'pair') {
      if (typeof data.s !== 'string' || !data.s) return null;
      return { v: 1, t: 'pair', s: data.s, n: typeof data.n === 'string' ? data.n : undefined };
    }
    if (data.t === 'pulse') {
      if (typeof data.ts !== 'number' || typeof data.sig !== 'string') return null;
      return { v: 1, t: 'pulse', ts: data.ts, sig: data.sig };
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyPulse(payload: PulsePayload, expectedSecret: string) {
  if (Math.abs(Date.now() - payload.ts) > PULSE_TTL_MS) return false;
  const expected = await sign(expectedSecret, payload.ts);
  return expected === payload.sig;
}
