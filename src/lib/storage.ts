import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IOSBlockedItem } from 'expo-app-blocker';

export type ModeId = 'trabajo' | 'estudio' | 'casa' | 'gym';

export type SessionRecord = {
  mode: ModeId;
  startedAt: number;
  endedAt: number;
};

export type TiempoState = {
  onboarded: boolean;
  tagId: string | null;
  /** Shared secret that partner phones use as a mobile key. */
  mobileKeySecret: string | null;
  /** If set, this install acts as a key for someone else's Apartag. */
  keyHolderSecret: string | null;
  keyHolderLabel: string | null;
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

export const MODES: { id: ModeId; title: string; subtitle: string; mark: string }[] = [
  { id: 'trabajo', title: 'Trabajo', subtitle: 'Deep work sin redes', mark: 'W' },
  { id: 'estudio', title: 'Estudio', subtitle: 'Apuntes y exámenes', mark: 'E' },
  { id: 'casa', title: 'Casa', subtitle: 'Cena y presencia', mark: 'H' },
  { id: 'gym', title: 'Deporte', subtitle: 'Entrena sin el feed', mark: 'D' },
];

export const DEFAULT_STATE: TiempoState = {
  onboarded: false,
  tagId: null,
  mobileKeySecret: null,
  keyHolderSecret: null,
  keyHolderLabel: null,
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
  strict: true,
};

const KEY = 'tiempo.state.v2';

function sanitizeState(raw: unknown): TiempoState {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATE;
  const data = raw as Partial<TiempoState> & { emergencyLeft?: number };
  const mode = MODES.some((m) => m.id === data.mode) ? (data.mode as ModeId) : DEFAULT_STATE.mode;
  return {
    ...DEFAULT_STATE,
    ...data,
    mode,
    tagId: typeof data.tagId === 'string' ? data.tagId : data.tagId === null ? null : DEFAULT_STATE.tagId,
    mobileKeySecret:
      typeof data.mobileKeySecret === 'string'
        ? data.mobileKeySecret
        : data.mobileKeySecret === null
          ? null
          : DEFAULT_STATE.mobileKeySecret,
    keyHolderSecret:
      typeof data.keyHolderSecret === 'string'
        ? data.keyHolderSecret
        : data.keyHolderSecret === null
          ? null
          : DEFAULT_STATE.keyHolderSecret,
    keyHolderLabel:
      typeof data.keyHolderLabel === 'string'
        ? data.keyHolderLabel
        : data.keyHolderLabel === null
          ? null
          : DEFAULT_STATE.keyHolderLabel,
    locked: Boolean(data.locked),
    lockedAt: typeof data.lockedAt === 'number' ? data.lockedAt : null,
    selectedPackages: Array.isArray(data.selectedPackages)
      ? data.selectedPackages.filter((p): p is string => typeof p === 'string')
      : DEFAULT_STATE.selectedPackages,
    iosSelectionData: typeof data.iosSelectionData === 'string' ? data.iosSelectionData : '',
    iosItems: Array.isArray(data.iosItems) ? data.iosItems : [],
    recoveredMs: typeof data.recoveredMs === 'number' ? Math.max(0, data.recoveredMs) : 0,
    sessions: Array.isArray(data.sessions) ? data.sessions.slice(0, 40) : [],
    onboarded: Boolean(data.onboarded),
    strict: true,
  };
}

export async function loadState(): Promise<TiempoState> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) ?? (await AsyncStorage.getItem('tiempo.state.v1'));
    if (!raw) return DEFAULT_STATE;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveState(state: TiempoState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
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

export function yearsFromDailyHours(dailyHours: number, age: number) {
  const remaining = Math.max(1, 80 - age);
  return (dailyHours / 24) * remaining;
}
