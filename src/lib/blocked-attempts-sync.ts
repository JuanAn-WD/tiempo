import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

import {
  EMPTY_LEDGER,
  STORAGE_KEY,
  mergeIntercepts,
  sanitizeLedger,
  type AttemptLimit,
  type AttemptsLedger,
} from '@/lib/blocked-attempts';

export type AttemptsSnapshot = {
  ledger: AttemptsLedger;
  limit: AttemptLimit;
  hydrated: boolean;
};

type Listener = () => void;

let ledger: AttemptsLedger = EMPTY_LEDGER;
let hydrated = false;
/** `null` until the native drain has been tried on this launch. */
let nativeAvailable: boolean | null = null;
let watching = false;
let chain: Promise<void> = Promise.resolve();
const listeners = new Set<Listener>();

function currentLimit(): AttemptLimit {
  if (nativeAvailable === false) return 'unavailable';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'unavailable';
}

let snapshot: AttemptsSnapshot = {
  ledger,
  limit: currentLimit(),
  hydrated,
};

function publish() {
  snapshot = { ledger, limit: currentLimit(), hydrated };
  for (const listener of listeners) listener();
}

export function getAttemptsSnapshot(): AttemptsSnapshot {
  return snapshot;
}

export function subscribeAttempts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readStored(): Promise<AttemptsLedger> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_LEDGER;
    return sanitizeLedger(JSON.parse(raw) as unknown);
  } catch {
    return EMPTY_LEDGER;
  }
}

async function drainNative(): Promise<unknown[]> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    nativeAvailable = false;
    return [];
  }
  try {
    const blocker = await import('expo-app-blocker');
    if (typeof blocker.drainPendingIntercepts !== 'function') {
      nativeAvailable = false;
      return [];
    }
    const events = blocker.drainPendingIntercepts();
    nativeAvailable = true;
    return Array.isArray(events) ? events : [];
  } catch {
    nativeAvailable = false;
    return [];
  }
}

async function syncOnce(): Promise<void> {
  try {
    const [stored, incoming] = await Promise.all([
      hydrated ? Promise.resolve(ledger) : readStored(),
      drainNative(),
    ]);
    if (!hydrated) ledger = stored;
    const next = mergeIntercepts(ledger, incoming);
    if (next !== ledger) {
      ledger = next;
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
      } catch {
        // The native queue is already cleared. Keep the in-memory total
        // so this launch still shows the attempts we just counted.
      }
    }
  } catch {
    nativeAvailable ??= false;
  } finally {
    hydrated = true;
    publish();
  }
}

/** Load the saved total and drain native events. Calls are serialized. */
export function refreshBlockedAttempts(): Promise<void> {
  const run = chain.then(syncOnce, syncOnce);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Drain again whenever Apartag returns to the foreground. Idempotent. */
export function watchBlockedAttempts() {
  if (watching) return;
  watching = true;
  AppState.addEventListener('change', (next) => {
    if (next === 'active') void refreshBlockedAttempts();
  });
}
