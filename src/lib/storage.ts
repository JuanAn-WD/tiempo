import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IOSBlockedItem } from 'expo-app-blocker';

import type { Locale } from '@/i18n/locale';
import { translate, type TranslationKey } from '@/i18n/translate';

import { normalizeEmergencyFields } from '@/lib/emergency';
import { sanitizeUsedNonces, type UsedPulseNonce } from '@/lib/mobile-key-mac';
import { ownAppIds } from '@/lib/own-app';
import { guardIosSelection, withoutOwnPackages } from '@/lib/self-block';

export type ModeId = 'trabajo' | 'estudio' | 'casa' | 'gym';

export type SessionRecord = {
  mode: ModeId;
  startedAt: number;
  endedAt: number;
  /** Set when the session ended with an emergency unlock. */
  emergency?: boolean;
};

export type TiempoState = {
  onboarded: boolean;
  tagId: string | null;
  /** Shared secret that partner phones use as a mobile key. */
  mobileKeySecret: string | null;
  /** Nonces of mobile-key QRs already accepted, so one code cannot be scanned twice. */
  usedMobileKeyNonces: UsedPulseNonce[];
  /** If set, this install acts as a key for someone else's Apartag. */
  keyHolderSecret: string | null;
  keyHolderLabel: string | null;
  /** Second NFC tag. Counts as a backup key for strict mode. */
  spareTagId: string | null;
  /** Charges left. Starts at 3, never above 3. */
  emergencyLeft: number;
  /** When the next single charge returns. Null while the bank is full. */
  emergencyRefillAt: number | null;
  /** Highest wall-clock time observed. Refills refuse to run if the clock is behind this. */
  lastSeenAt: number;
  locked: boolean;
  lockedAt: number | null;
  selectedPackages: string[];
  iosSelectionData: string;
  iosItems: IOSBlockedItem[];
  mode: ModeId;
  recoveredMs: number;
  sessions: SessionRecord[];
  strict: boolean;
};

export const MODES: { id: ModeId; titleKey: TranslationKey; subtitleKey: TranslationKey; mark: string }[] = [
  { id: 'trabajo', titleKey: 'modes.trabajo.title', subtitleKey: 'modes.trabajo.subtitle', mark: 'W' },
  { id: 'estudio', titleKey: 'modes.estudio.title', subtitleKey: 'modes.estudio.subtitle', mark: 'E' },
  { id: 'casa', titleKey: 'modes.casa.title', subtitleKey: 'modes.casa.subtitle', mark: 'H' },
  { id: 'gym', titleKey: 'modes.gym.title', subtitleKey: 'modes.gym.subtitle', mark: 'D' },
];

export const DEFAULT_STATE: TiempoState = {
  onboarded: false,
  tagId: null,
  mobileKeySecret: null,
  usedMobileKeyNonces: [],
  keyHolderSecret: null,
  keyHolderLabel: null,
  spareTagId: null,
  emergencyLeft: 3,
  emergencyRefillAt: null,
  lastSeenAt: 0,
  locked: false,
  lockedAt: null,
  selectedPackages: [
    'com.instagram.android',
    'com.zhiliaoapp.musically',
    'com.google.android.youtube',
    'com.twitter.android',
  ],
  iosSelectionData: '',
  iosItems: [],
  mode: 'trabajo',
  recoveredMs: 0,
  sessions: [],
  strict: false,
};

const KEY = 'tiempo.state.v3';
const LEGACY_KEYS = ['tiempo.state.v2', 'tiempo.state.v1'];

function nullableString(value: unknown, fallback: string | null) {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return fallback;
}

function sanitizeIosItems(raw: unknown): IOSBlockedItem[] {
  if (!Array.isArray(raw)) return [];
  const items: IOSBlockedItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<IOSBlockedItem>;
    if (typeof row.token !== 'string' || !row.token) continue;
    const type = row.type === 'category' || row.type === 'webDomain' || row.type === 'app' ? row.type : 'app';
    const next: IOSBlockedItem = { type, token: row.token };
    if (typeof row.bundleIdentifier === 'string') next.bundleIdentifier = row.bundleIdentifier;
    if (typeof row.displayName === 'string') next.displayName = row.displayName;
    if (typeof row.categoryName === 'string') next.categoryName = row.categoryName;
    if (typeof row.domain === 'string') next.domain = row.domain;
    items.push(next);
  }
  return items;
}

function sanitizeSessions(raw: unknown): SessionRecord[] {
  if (!Array.isArray(raw)) return [];
  const sessions: SessionRecord[] = [];
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const session = item as Partial<SessionRecord>;
    if (!MODES.some((mode) => mode.id === session.mode)) continue;
    if (typeof session.startedAt !== 'number' || typeof session.endedAt !== 'number') continue;
    const next: SessionRecord = {
      mode: session.mode as ModeId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
    if (session.emergency === true) next.emergency = true;
    sessions.push(next);
  }
  return sessions;
}

export function sanitizeState(
  raw: unknown,
  options: { honorStrict: boolean; now?: number },
): TiempoState {
  const now = options.now ?? Date.now();
  if (!raw || typeof raw !== 'object') {
    const emergency = normalizeEmergencyFields({}, now, options.honorStrict);
    return { ...DEFAULT_STATE, ...emergency };
  }
  const data = raw as Partial<TiempoState>;
  const mode = MODES.some((m) => m.id === data.mode) ? (data.mode as ModeId) : DEFAULT_STATE.mode;
  const emergency = normalizeEmergencyFields(data, now, options.honorStrict);
  return {
    ...DEFAULT_STATE,
    ...data,
    mode,
    tagId: nullableString(data.tagId, DEFAULT_STATE.tagId),
    mobileKeySecret: nullableString(data.mobileKeySecret, DEFAULT_STATE.mobileKeySecret),
    usedMobileKeyNonces: sanitizeUsedNonces(data.usedMobileKeyNonces, now, emergency.lastSeenAt),
    keyHolderSecret: nullableString(data.keyHolderSecret, DEFAULT_STATE.keyHolderSecret),
    keyHolderLabel: nullableString(data.keyHolderLabel, DEFAULT_STATE.keyHolderLabel),
    spareTagId: nullableString(data.spareTagId, null),
    locked: Boolean(data.locked),
    lockedAt: typeof data.lockedAt === 'number' ? data.lockedAt : null,
    selectedPackages: withoutOwnPackages(
      Array.isArray(data.selectedPackages)
        ? data.selectedPackages.filter((p): p is string => typeof p === 'string')
        : DEFAULT_STATE.selectedPackages,
      ownAppIds(),
    ),
    iosSelectionData: typeof data.iosSelectionData === 'string' ? data.iosSelectionData : '',
    iosItems: guardIosSelection(sanitizeIosItems(data.iosItems), ownAppIds()).items,
    recoveredMs: typeof data.recoveredMs === 'number' ? Math.max(0, data.recoveredMs) : 0,
    sessions: sanitizeSessions(data.sessions),
    onboarded: Boolean(data.onboarded),
    emergencyLeft: emergency.emergencyLeft,
    emergencyRefillAt: emergency.emergencyRefillAt,
    lastSeenAt: emergency.lastSeenAt,
    strict: emergency.strict,
  };
}

export async function loadState(): Promise<TiempoState> {
  try {
    const current = await AsyncStorage.getItem(KEY);
    if (current) return sanitizeState(JSON.parse(current), { honorStrict: true });
    const legacy =
      (await AsyncStorage.getItem(LEGACY_KEYS[0])) ?? (await AsyncStorage.getItem(LEGACY_KEYS[1]));
    if (!legacy) return sanitizeState(null, { honorStrict: false });
    // v2 always persisted strict:true. That was not a user choice.
    return sanitizeState(JSON.parse(legacy), { honorStrict: false });
  } catch {
    return sanitizeState(null, { honorStrict: false });
  }
}

export async function saveState(state: TiempoState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  await AsyncStorage.multiRemove(LEGACY_KEYS);
}

export function formatDuration(ms: number, locale: Locale = 'es') {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours <= 0) return translate(locale, 'duration.minutes', { count: minutes });
  return translate(locale, 'duration.hoursMinutes', { hours, minutes });
}

export function formatClock(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export { yearsFromDailyHours } from '@/lib/screen-years';
