import {
  EMPTY_STORE_REVIEW_RECORD,
  INITIAL_REVIEW_ARM,
  REVIEW_AFTER_COMPLETED_SESSIONS,
  REVIEW_MIN_INTERVAL_MS,
  STORE_REVIEW_STORAGE_KEY,
  armStoreReview,
  countCompletedFocusSessions,
  isAppForeground,
  isCompletedFocusSession,
  markReviewRequested,
  normalizeAppVersion,
  parseStoreReviewRecord,
  reviewDecisionDefers,
  shouldRequestStoreReview,
  type ReviewSession,
  type ReviewSnapshot,
  type StoreReviewRecord,
} from './store-review';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function session(index: number, emergency = false): ReviewSession {
  const startedAt = NOW + index * 60_000;
  return {
    startedAt,
    endedAt: startedAt + 25 * 60_000,
    ...(emergency ? { emergency: true as const } : {}),
  };
}

/** Newest first, as the store keeps them. */
function history(count: number, emergencyAt: number[] = []): ReviewSession[] {
  const sessions: ReviewSession[] = [];
  for (let index = count; index >= 1; index -= 1) {
    sessions.push(session(index, emergencyAt.includes(index)));
  }
  return sessions;
}

function snapshot(overrides: Partial<ReviewSnapshot> = {}): ReviewSnapshot {
  return {
    locked: false,
    route: '(tabs)',
    appActive: true,
    sessions: history(REVIEW_AFTER_COMPLETED_SESSIONS),
    record: EMPTY_STORE_REVIEW_RECORD,
    appVersion: '1.0.0',
    now: NOW + 10 * DAY,
    ...overrides,
  };
}

export function testStoreReview() {
  check(REVIEW_AFTER_COMPLETED_SESSIONS === 5, 'ask after the 5th completed session');
  check(REVIEW_MIN_INTERVAL_MS === 120 * DAY, 'throttle is 120 days');
  check(STORE_REVIEW_STORAGE_KEY === 'apartag.store-review.v1', 'review record has its own key');
  const reservedKeys: string[] = ['tiempo.state.v3', 'apartag.pro.v1'];
  check(!reservedKeys.includes(STORE_REVIEW_STORAGE_KEY), 'review record is stored apart from session and Pro state');

  check(normalizeAppVersion(' 1.2.0 ') === '1.2.0', 'version is trimmed');
  check(normalizeAppVersion(null) === '', 'missing version is empty');
  check(isAppForeground('active'), 'active is foreground');
  check(isAppForeground('unknown'), 'unknown still counts as foreground');
  check(!isAppForeground('background'), 'background is not foreground');
  check(!isAppForeground('inactive'), 'inactive is not foreground');

  check(isCompletedFocusSession(session(1)), 'a normal session counts');
  check(!isCompletedFocusSession(session(1, true)), 'an emergency unlock does not count');
  check(!isCompletedFocusSession({ startedAt: 10, endedAt: 10 }), 'zero length does not count');
  check(!isCompletedFocusSession({ startedAt: 10, endedAt: 9 }), 'negative length does not count');
  check(!isCompletedFocusSession(null), 'missing session does not count');

  const mixed = [session(3, true), session(2), session(1, true), session(0)];
  check(countCompletedFocusSessions(mixed) === 2, 'only non-emergency sessions count');
  check(countCompletedFocusSessions(history(4)) === 4, 'four completions stay under the bar');
  check(countCompletedFocusSessions(history(5)) === 5, 'five completions reach the bar');

  let arm = armStoreReview(INITIAL_REVIEW_ARM, history(5));
  check(arm.booted && !arm.pending, 'history already on disk does not ask on launch');
  arm = armStoreReview(arm, history(5));
  check(!arm.pending, 'the same latest session does not arm twice');

  arm = armStoreReview(INITIAL_REVIEW_ARM, history(4));
  arm = armStoreReview(arm, history(5));
  check(arm.pending, 'the 5th completed session arms the ask');

  arm = armStoreReview(INITIAL_REVIEW_ARM, history(4));
  arm = armStoreReview(arm, [session(5, true), ...history(4)]);
  check(!arm.pending, 'an emergency as the 5th event does not arm');

  arm = armStoreReview(INITIAL_REVIEW_ARM, history(4));
  arm = armStoreReview(arm, history(5));
  check(arm.pending, 'pending before the emergency');
  arm = armStoreReview(arm, [session(6, true), ...history(5)]);
  check(!arm.pending, 'a later emergency clears a pending ask');

  arm = armStoreReview(INITIAL_REVIEW_ARM, history(8));
  arm = armStoreReview(arm, history(9));
  check(arm.pending, 'a completion after the 5th still arms if we never asked');

  const kept = armStoreReview(arm, history(9));
  check(kept === arm, 'an unchanged session list keeps the pending flag');

  check(shouldRequestStoreReview(snapshot()) === 'ask', '5th session on the home screen asks');
  check(
    shouldRequestStoreReview(snapshot({ sessions: history(4) })) === 'too-few',
    'four sessions stay quiet',
  );
  check(shouldRequestStoreReview(snapshot({ locked: true })) === 'locked', 'an active lock never asks');
  check(
    shouldRequestStoreReview(snapshot({ route: 'blocked' })) === 'route',
    'the lock screen is not a place to ask',
  );
  check(
    shouldRequestStoreReview(snapshot({ route: 'scan-key' })) === 'route',
    'the scanner is not a place to ask',
  );
  check(
    shouldRequestStoreReview(snapshot({ route: 'emergency' })) === 'emergency',
    'the emergency screen never asks',
  );
  check(
    shouldRequestStoreReview(snapshot({ sessions: [session(6, true), ...history(5)] })) === 'emergency',
    'never ask off the back of an emergency unlock',
  );
  check(
    shouldRequestStoreReview(snapshot({ sessions: [...history(4), session(0, true)] })) === 'too-few',
    'emergencies do not fill the five',
  );
  check(shouldRequestStoreReview(snapshot({ appActive: false })) === 'inactive', 'background never asks');
  check(shouldRequestStoreReview(snapshot({ route: undefined })) === 'route', 'an unknown route waits');
  check(shouldRequestStoreReview(snapshot({ appVersion: '  ' })) === 'no-version', 'blank version waits');

  const asked: StoreReviewRecord = { versions: ['1.0.0'], lastRequestedAt: NOW };
  check(
    shouldRequestStoreReview(snapshot({ record: asked, now: NOW + 400 * DAY })) === 'already-this-version',
    'one ask per app version',
  );
  check(
    shouldRequestStoreReview(
      snapshot({ record: asked, appVersion: '1.1.0', now: NOW + 10 * DAY }),
    ) === 'throttled',
    'a new version still waits out the throttle',
  );
  check(
    shouldRequestStoreReview(
      snapshot({ record: asked, appVersion: '1.1.0', now: NOW + REVIEW_MIN_INTERVAL_MS }),
    ) === 'ask',
    'a new version can ask once the throttle has elapsed',
  );
  check(
    shouldRequestStoreReview(
      snapshot({ record: { versions: [], lastRequestedAt: NOW + DAY }, now: NOW }),
    ) === 'clock',
    'a clock moved backwards does not ask',
  );

  check(reviewDecisionDefers('locked'), 'lock defers');
  check(reviewDecisionDefers('route'), 'route defers');
  check(reviewDecisionDefers('inactive'), 'background defers');
  check(!reviewDecisionDefers('emergency'), 'emergency does not defer');
  check(!reviewDecisionDefers('ask'), 'ask is not a defer');
  check(!reviewDecisionDefers('already-this-version'), 'version cap is final for this session');

  check(parseStoreReviewRecord(null).versions.length === 0, 'null record is empty');
  check(parseStoreReviewRecord('not-json').lastRequestedAt === null, 'bad json is empty');
  const parsed = parseStoreReviewRecord(
    JSON.stringify({ versions: ['1.0.0', ' 1.0.0 ', '', '1.1.0'], lastRequestedAt: NOW }),
  );
  check(parsed.versions.join(',') === '1.0.0,1.1.0', 'versions are trimmed and unique');
  check(parsed.lastRequestedAt === NOW, 'timestamp is kept');
  check(parseStoreReviewRecord({ versions: ['1.0.0'], lastRequestedAt: 0 }).lastRequestedAt === null, 'zero time is dropped');

  const marked = markReviewRequested(EMPTY_STORE_REVIEW_RECORD, ' 1.0.0 ', NOW);
  check(marked.versions[0] === '1.0.0', 'mark stores the trimmed version');
  check(marked.lastRequestedAt === NOW, 'mark stores the time');
  const again = markReviewRequested(marked, '1.0.0', NOW + DAY);
  check(again.versions.length === 1, 'the same version is not stored twice');
  check(again.lastRequestedAt === NOW + DAY, 'a repeat still updates the time');
}
