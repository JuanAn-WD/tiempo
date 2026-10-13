import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import {
  NONCE_RETENTION_MS,
  PULSE_SKEW_MS,
  PULSE_TTL_MS,
  buildPairPayload,
  buildPulsePayload,
  hmacSha256Hex,
  parseKeyPayload,
  rememberNonce,
  sanitizeUsedNonces,
  verifyPulse,
} from './mobile-key-mac';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const SECRET = 'ab'.repeat(24);
const NONCE_A = '0123456789abcdef0123456789abcdef';
const NONCE_B = 'fedcba9876543210fedcba9876543210';

function pulse(secret: string, ts: number, nonce: string) {
  const parsed = parseKeyPayload(buildPulsePayload(secret, ts, nonce));
  check(parsed && parsed.t === 'pulse' && parsed.v === 2, 'pulse did not parse');
  return parsed;
}

export function testMobileKeyMac() {
  const rfcKey = new Uint8Array(20).fill(0x0b);
  const rfcMsg = Uint8Array.from([0x48, 0x69, 0x20, 0x54, 0x68, 0x65, 0x72, 0x65]);
  check(
    hmacSha256Hex(rfcKey, rfcMsg) === 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    'HMAC-SHA256 does not match RFC 4231 test case 1',
  );

  const ts = 1_700_000_000_000;
  const signed = pulse(SECRET, ts, NONCE_A);
  const fresh = verifyPulse(signed, SECRET, { now: ts });
  check(fresh.ok && fresh.nonce === NONCE_A, 'fresh pulse should verify');

  const wrong = verifyPulse(signed, `${SECRET}ff`, { now: ts });
  check(!wrong.ok && wrong.reason === 'bad-signature', 'wrong secret should fail');

  const tampered = verifyPulse({ ...signed, n: NONCE_B }, SECRET, { now: ts });
  check(!tampered.ok && tampered.reason === 'bad-signature', 'swapped nonce should fail');

  const flipped = verifyPulse(
    { ...signed, sig: signed.sig.slice(0, -1) + (signed.sig.endsWith('0') ? '1' : '0') },
    SECRET,
    { now: ts },
  );
  check(!flipped.ok && flipped.reason === 'bad-signature', 'flipped signature should fail');

  const used = rememberNonce([], NONCE_A, ts, ts);
  const replay = verifyPulse(signed, SECRET, { now: ts + 1_000, usedNonces: used });
  check(!replay.ok && replay.reason === 'replay', 'same nonce should be rejected');

  const other = pulse(SECRET, ts + 1_000, NONCE_B);
  const second = verifyPulse(other, SECRET, { now: ts + 1_000, usedNonces: used });
  check(second.ok, 'a new nonce in the same minute should verify');

  const atTtl = verifyPulse(signed, SECRET, { now: ts + PULSE_TTL_MS });
  check(atTtl.ok, 'a pulse should still verify at 60s');

  const withinSkew = verifyPulse(signed, SECRET, { now: ts + PULSE_TTL_MS + PULSE_SKEW_MS });
  check(withinSkew.ok, 'clock lag within the skew budget should still verify');

  const expired = verifyPulse(signed, SECRET, { now: ts + PULSE_TTL_MS + PULSE_SKEW_MS + 1 });
  check(!expired.ok && expired.reason === 'expired', 'past ttl plus skew should expire');

  const ahead = verifyPulse(signed, SECRET, { now: ts - PULSE_SKEW_MS });
  check(ahead.ok, 'a key phone up to the skew budget ahead should verify');

  const tooAhead = verifyPulse(signed, SECRET, { now: ts - PULSE_SKEW_MS - 1 });
  check(!tooAhead.ok && tooAhead.reason === 'skew', 'a key phone past the skew budget should fail');

  const oldMac = bytesToHex(sha256(utf8ToBytes(`${SECRET}:${ts}`))).slice(0, 24);
  const legacy = parseKeyPayload(JSON.stringify({ v: 1, t: 'pulse', ts, sig: oldMac }));
  check(legacy && legacy.t === 'pulse' && legacy.v === 1, 'old pulse should still parse');
  if (!legacy || legacy.t !== 'pulse' || legacy.v !== 1) return;
  const legacyVerdict = verifyPulse(legacy, SECRET, { now: ts });
  check(!legacyVerdict.ok && legacyVerdict.reason === 'legacy', 'old truncated hash must not unlock');

  const oldPair = parseKeyPayload(JSON.stringify({ v: 1, t: 'pair', s: SECRET, n: 'casa' }));
  check(
    oldPair && oldPair.t === 'pair' && oldPair.s === SECRET && oldPair.n === 'casa' && oldPair.alg === undefined,
    'a pairing QR from before HMAC should still yield the same secret',
  );

  const newPair = parseKeyPayload(buildPairPayload(SECRET, 'casa'));
  check(
    newPair && newPair.t === 'pair' && newPair.s === SECRET && newPair.alg === 'hmac-sha256',
    'new pairing QR should keep v1 and name the algorithm',
  );

  check(parseKeyPayload(JSON.stringify({ v: 1, t: 'pair', s: SECRET, alg: 'sha256' })) === null, 'unknown alg');
  check(parseKeyPayload('not-json') === null, 'garbage');
  check(parseKeyPayload(JSON.stringify({ v: 2, t: 'pulse', ts, n: 'ZZ', sig: 'ab' })) === null, 'bad nonce');

  const remembered = rememberNonce([], NONCE_A, ts, ts);
  check(remembered.length === 1 && remembered[0].exp >= ts + NONCE_RETENTION_MS, 'nonce should be retained');
  const pruned = sanitizeUsedNonces(remembered, ts + NONCE_RETENTION_MS + 1);
  check(pruned.length === 0, 'a nonce should drop after the retention window');
  const held = sanitizeUsedNonces(remembered, ts - 10_000, ts);
  check(held.length === 1, 'a clock step backward should not forget a spent nonce');
  const rolledBack = sanitizeUsedNonces([{ n: NONCE_A, exp: ts }], ts - 50_000, ts + 10_000);
  check(rolledBack.length === 1, 'rolling the clock back should keep a nonce whose expiry already passed');

  const junk = sanitizeUsedNonces([{ n: 'nope' }, { n: NONCE_A, exp: ts + 10 }, 'x', null], ts);
  check(junk.length === 1 && junk[0].n === NONCE_A, 'malformed nonce rows should be dropped');

  let many = [] as { n: string; exp: number }[];
  for (let i = 0; i < 140; i++) {
    many = rememberNonce(many, i.toString(16).padStart(32, '0'), ts, ts);
  }
  check(many.length === 128, 'remembered nonces should stay capped');
  check(many[0].n !== '0'.repeat(32), 'the oldest nonce should fall out of the cap');
}
