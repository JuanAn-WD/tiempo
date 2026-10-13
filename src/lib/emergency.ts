/** Emergency unlocks: 3 charges, one back every 30 days, never paid. */

export const EMERGENCY_MAX = 3;
export const EMERGENCY_REFILL_MS = 30 * 24 * 60 * 60 * 1000;
export const EMERGENCY_COUNTDOWN_MS = 5 * 60 * 1000;
/** Wall-clock jitter we still treat as the same moment. */
export const CLOCK_SLOP_MS = 15_000;
export const STRICT_CONFIRMATION = 'ESTRICTO';

export type EmergencySnapshot = {
  emergencyLeft: number;
  /** Wall-clock ms when the next +1 is due. Null when the bank is full. */
  emergencyRefillAt: number | null;
  /** Highest wall clock we have accepted. Never moves backwards. */
  lastSeenAt: number;
  strict: boolean;
};

export type MonoClock = {
  lastWall: number;
  lastMono: number;
  primed: boolean;
};

export const INITIAL_MONO_CLOCK: MonoClock = {
  lastWall: 0,
  lastMono: 0,
  primed: false,
};

export type KeySet = {
  tagId: string | null;
  spareTagId: string | null;
  mobileKeySecret: string | null;
};

export function monotonicNow(): number {
  const clock = globalThis.performance;
  if (clock && typeof clock.now === 'function') return clock.now();
  return 0;
}

export function countKeys(keys: KeySet): number {
  return [keys.tagId, keys.spareTagId, keys.mobileKeySecret].filter(
    (value) => typeof value === 'string' && value.length > 0,
  ).length;
}

/** Strict mode needs a way out besides the key you might lose. */
export function hasBackupKey(keys: KeySet): boolean {
  return countKeys(keys) >= 2;
}

export function canDropKey(keys: KeySet & { strict: boolean }, patch: Partial<KeySet>): boolean {
  if (!keys.strict) return true;
  return countKeys({ ...keys, ...patch }) >= 2;
}

export function normalizeEmergencyFields(
  data: {
    emergencyLeft?: unknown;
    emergencyRefillAt?: unknown;
    lastSeenAt?: unknown;
    strict?: unknown;
  },
  now: number,
  honorStrict: boolean,
): EmergencySnapshot {
  let emergencyLeft = EMERGENCY_MAX;
  if (typeof data.emergencyLeft === 'number' && Number.isFinite(data.emergencyLeft)) {
    emergencyLeft = Math.min(EMERGENCY_MAX, Math.max(0, Math.floor(data.emergencyLeft)));
  }

  const lastSeenAt =
    typeof data.lastSeenAt === 'number' && Number.isFinite(data.lastSeenAt) && data.lastSeenAt > 0
      ? data.lastSeenAt
      : now;

  let emergencyRefillAt: number | null = null;
  if (
    typeof data.emergencyRefillAt === 'number' &&
    Number.isFinite(data.emergencyRefillAt) &&
    data.emergencyRefillAt > 0
  ) {
    emergencyRefillAt = data.emergencyRefillAt;
  }

  if (emergencyLeft >= EMERGENCY_MAX) {
    emergencyRefillAt = null;
  } else if (emergencyRefillAt == null) {
    emergencyRefillAt = Math.max(lastSeenAt, now) + EMERGENCY_REFILL_MS;
  }

  return {
    emergencyLeft,
    emergencyRefillAt,
    lastSeenAt,
    strict: honorStrict ? data.strict === true : false,
  };
}

/**
 * Move the emergency bank forward.
 *
 * A backward clock (`now < lastSeenAt`) never refills.
 * While this process is alive, only monotonic time counts, so jumping the
 * clock forward does not finish the 30 days. The watermark still advances to
 * `now` and the deadline is pushed by the untrusted gap, so that jump cannot
 * be replayed after a restart.
 * A cold start trusts a forward gap: we cannot tell a month away from a clock
 * change made while the app was dead.
 */
export function advanceEmergencyClock(
  state: EmergencySnapshot,
  clock: MonoClock,
  now: number,
  mono: number,
): { state: EmergencySnapshot; clock: MonoClock } {
  if (!Number.isFinite(now) || !Number.isFinite(mono)) {
    return { state, clock };
  }

  const nextClock: MonoClock = { lastWall: now, lastMono: mono, primed: true };

  if (now < state.lastSeenAt) {
    return { state, clock: nextClock };
  }

  const wallElapsed = now - state.lastSeenAt;
  let trusted = wallElapsed;
  if (clock.primed) {
    const wallDelta = now - clock.lastWall;
    const monoDelta = mono - clock.lastMono;
    if (wallDelta < 0 || monoDelta < 0) {
      trusted = 0;
    } else {
      trusted = Math.min(wallElapsed, wallDelta, monoDelta + CLOCK_SLOP_MS);
    }
  }
  if (trusted < 0) trusted = 0;

  let left = state.emergencyLeft;
  let refillAt = state.emergencyRefillAt;
  let guard = 0;
  while (refillAt != null && left < EMERGENCY_MAX && guard < EMERGENCY_MAX) {
    const remaining = refillAt - state.lastSeenAt;
    if (trusted < remaining) break;
    left += 1;
    refillAt = left >= EMERGENCY_MAX ? null : refillAt + EMERGENCY_REFILL_MS;
    guard += 1;
  }

  if (refillAt != null) {
    const remainingAfter = Math.max(0, refillAt - (state.lastSeenAt + trusted));
    refillAt = now + remainingAfter;
  }

  return {
    state: {
      ...state,
      emergencyLeft: left,
      emergencyRefillAt: refillAt,
      lastSeenAt: now,
    },
    clock: nextClock,
  };
}

/** Spend one charge. Returns null when strict mode is on or the bank is empty. */
export function consumeEmergency(state: EmergencySnapshot, now: number): EmergencySnapshot | null {
  if (state.strict || state.emergencyLeft <= 0) return null;
  const left = state.emergencyLeft - 1;
  const anchor = Math.max(state.lastSeenAt, Number.isFinite(now) ? now : state.lastSeenAt);
  const emergencyRefillAt =
    left >= EMERGENCY_MAX ? null : (state.emergencyRefillAt ?? anchor + EMERGENCY_REFILL_MS);
  return {
    ...state,
    emergencyLeft: left,
    emergencyRefillAt,
    lastSeenAt: anchor,
  };
}

export function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatRefillDate(ts: number) {
  return new Date(ts).toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
