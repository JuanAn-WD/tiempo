/**
 * NFC identifier checks.
 *
 * ISO/IEC 14443-3 single-size UIDs are 4 bytes. A value whose first byte is
 * 0x08 is a Random ID: the card (typical of payment cards) mints a new one
 * on every scan, so it cannot be a key.
 */

const HEX = /^[0-9A-F]+$/;

export function normalizeTagId(raw: unknown): string | null {
  if (typeof raw === 'string') {
    let text = raw.trim();
    if (text.toLowerCase().startsWith('0x')) text = text.slice(2);
    const hex = text.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (hex.length < 8 || hex.length % 2 !== 0 || !HEX.test(hex)) return null;
    return hex;
  }

  if (Array.isArray(raw) && raw.length > 0 && raw.every((part) => typeof part === 'number' && part >= 0 && part <= 255)) {
    const hex = raw.map((part) => (part & 0xff).toString(16).padStart(2, '0')).join('').toUpperCase();
    if (hex.length < 8) return null;
    return hex;
  }

  return null;
}

/** Pull a stable id from a react-native-nfc-manager tag. FeliCa exposes `idm`, not `id`. */
export function tagIdFromEvent(tag: unknown): string | null {
  if (!tag || typeof tag !== 'object') return null;
  const record = tag as { id?: unknown; idm?: unknown };
  return normalizeTagId(record.id) ?? normalizeTagId(record.idm);
}

export function isUnstableTagId(id: string): boolean {
  const hex = normalizeTagId(id);
  if (!hex) return true;
  if (/^0+$/.test(hex) || /^F+$/.test(hex)) return true;
  // 4-byte UID, uid0 = 0x08 → Random ID (ISO/IEC 14443-3).
  if (hex.length === 8 && hex.startsWith('08')) return true;
  return false;
}

export function sameTagId(a: string, b: string): boolean {
  const left = normalizeTagId(a);
  const right = normalizeTagId(b);
  return left != null && left === right;
}
