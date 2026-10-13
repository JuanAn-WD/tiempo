/**
 * When to ask for a store rating.
 *
 * After the 5th completed focus session, once, through the native in-app
 * review sheet. Emergency unlocks do not count and never trigger the ask.
 * An active lock never triggers it either. The prompt record lives in its
 * own storage key so it is not wiped with session state.
 *
 * The system sheet is localized by the OS. This module has no copy of its own.
 */

export const STORE_REVIEW_STORAGE_KEY = 'apartag.store-review.v1';

/** Completed focus sessions required before the first ask. */
export const REVIEW_AFTER_COMPLETED_SESSIONS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimum gap between asks, even after an update.
 * Once per version would still stack if releases are frequent; the stores
 * themselves cap how often the sheet appears (about three times a year).
 */
export const REVIEW_MIN_INTERVAL_MS = 120 * DAY_MS;

/** Let navigation from the lock screen settle before the system sheet. */
export const REVIEW_PRESENT_DELAY_MS = 1_500;

/** Home is the only settled surface. Modals and the lock UI wait. */
export const REVIEW_SETTLED_ROUTE = '(tabs)';

export type ReviewSession = {
  startedAt: number;
  endedAt: number;
  emergency?: boolean;
};

export type StoreReviewRecord = {
  /** App versions that already requested a review. */
  versions: string[];
  /** Wall-clock time of the last request. Null until the first one. */
  lastRequestedAt: number | null;
};

export const EMPTY_STORE_REVIEW_RECORD: StoreReviewRecord = {
  versions: [],
  lastRequestedAt: null,
};

export type ReviewArmState = {
  /** False until the loaded history has been observed once. */
  booted: boolean;
  seenKey: string | null;
  /** True only after a new qualifying completion past the threshold. */
  pending: boolean;
};

export const INITIAL_REVIEW_ARM: ReviewArmState = {
  booted: false,
  seenKey: null,
  pending: false,
};

export type ReviewDecision =
  | 'ask'
  | 'inactive'
  | 'locked'
  | 'emergency'
  | 'route'
  | 'not-completed'
  | 'too-few'
  | 'no-version'
  | 'already-this-version'
  | 'throttled'
  | 'clock';

export type ReviewSnapshot = {
  locked: boolean;
  /** Root Expo Router segment, such as `(tabs)` or `emergency`. */
  route: string | undefined;
  appActive: boolean;
  /** Newest session first, matching `TiempoState.sessions`. */
  sessions: readonly ReviewSession[];
  record: StoreReviewRecord;
  appVersion: string;
  now: number;
};

export function normalizeAppVersion(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function isAppForeground(state: string): boolean {
  return state === 'active' || state === 'unknown';
}

/** A focus session that ended on its own, not through an emergency unlock. */
export function isCompletedFocusSession(session: ReviewSession | null | undefined): boolean {
  if (!session || session.emergency === true) return false;
  if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.endedAt)) return false;
  return session.endedAt > session.startedAt;
}

export function countCompletedFocusSessions(sessions: readonly ReviewSession[]): number {
  let count = 0;
  for (const session of sessions) {
    if (isCompletedFocusSession(session)) count += 1;
  }
  return count;
}

export function focusSessionKey(session: ReviewSession | null | undefined): string | null {
  if (!session) return null;
  if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.endedAt)) return null;
  return `${session.startedAt}:${session.endedAt}:${session.emergency === true ? 1 : 0}`;
}

/**
 * Arms a prompt only when a new session arrives after hydration.
 * Opening the app with five old sessions does not ask.
 * An emergency completion clears a pending ask.
 */
export function armStoreReview(prev: ReviewArmState, sessions: readonly ReviewSession[]): ReviewArmState {
  const latest = sessions[0] ?? null;
  const key = focusSessionKey(latest);
  if (!prev.booted) {
    return { booted: true, seenKey: key, pending: false };
  }
  if (key === prev.seenKey) return prev;
  const pending =
    isCompletedFocusSession(latest) &&
    countCompletedFocusSessions(sessions) >= REVIEW_AFTER_COMPLETED_SESSIONS;
  return { booted: true, seenKey: key, pending };
}

/** Reasons that can become `ask` without another completed session. */
export function reviewDecisionDefers(decision: ReviewDecision): boolean {
  return decision === 'inactive' || decision === 'locked' || decision === 'route';
}

export function shouldRequestStoreReview(input: ReviewSnapshot): ReviewDecision {
  const latest = input.sessions[0] ?? null;
  if (!input.appActive) return 'inactive';
  if (input.locked) return 'locked';
  if (latest?.emergency === true || input.route === 'emergency') return 'emergency';
  if (input.route !== REVIEW_SETTLED_ROUTE) return 'route';
  if (!isCompletedFocusSession(latest)) return 'not-completed';
  if (countCompletedFocusSessions(input.sessions) < REVIEW_AFTER_COMPLETED_SESSIONS) return 'too-few';

  const version = normalizeAppVersion(input.appVersion);
  if (!version) return 'no-version';
  if (input.record.versions.includes(version)) return 'already-this-version';
  if (input.record.lastRequestedAt != null) {
    if (!(input.now >= input.record.lastRequestedAt)) return 'clock';
    if (input.now - input.record.lastRequestedAt < REVIEW_MIN_INTERVAL_MS) return 'throttled';
  }
  return 'ask';
}

export function parseStoreReviewRecord(raw: unknown): StoreReviewRecord {
  let data = raw;
  if (typeof raw === 'string') {
    if (!raw) return EMPTY_STORE_REVIEW_RECORD;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return EMPTY_STORE_REVIEW_RECORD;
    }
  }
  if (!data || typeof data !== 'object') return EMPTY_STORE_REVIEW_RECORD;
  const source = data as { versions?: unknown; lastRequestedAt?: unknown };
  const versions: string[] = [];
  if (Array.isArray(source.versions)) {
    for (const entry of source.versions) {
      const version = normalizeAppVersion(entry);
      if (!version || versions.includes(version)) continue;
      versions.push(version);
    }
  }
  const last = source.lastRequestedAt;
  const lastRequestedAt = typeof last === 'number' && Number.isFinite(last) && last > 0 ? last : null;
  return {
    versions: versions.slice(-12),
    lastRequestedAt,
  };
}

export function markReviewRequested(
  record: StoreReviewRecord,
  appVersion: string,
  now: number,
): StoreReviewRecord {
  const version = normalizeAppVersion(appVersion);
  const versions = version && !record.versions.includes(version) ? [...record.versions, version] : record.versions;
  return {
    versions: versions.slice(-12),
    lastRequestedAt: now,
  };
}
