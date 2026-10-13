import {
  EMPTY_LEDGER,
  INTERCEPT_DEBOUNCE_MS,
  IOS_APP_GROUP,
  IOS_INTERCEPTS_KEY,
  NATIVE_QUEUE_CAP,
  PLATFORM_LIMITS,
  RECENT_CAP,
  SEEN_CAP,
  STORAGE_KEY,
  eventKey,
  mergeIntercepts,
  platformLimitKey,
  sanitizeIntercept,
  sanitizeLedger,
  type AttemptEvent,
  type AttemptsLedger,
} from './blocked-attempts';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sameLedger(left: AttemptsLedger, right: AttemptsLedger) {
  check(left.total === right.total, `total ${left.total} !== ${right.total}`);
  check(left.recent.length === right.recent.length, 'recent length');
  left.recent.forEach((event, index) => {
    const other = right.recent[index];
    check(event.interceptedAt === other?.interceptedAt, `recent time ${index}`);
    check(event.appName === other?.appName, `recent name ${index}`);
  });
  check(left.seen.join('|') === right.seen.join('|'), 'seen keys');
}

function event(interceptedAt: number, appName: string | null = 'Instagram'): AttemptEvent {
  return { appName, interceptedAt };
}

export function testBlockedAttempts() {
  check(IOS_APP_GROUP === 'group.com.apartag.app', 'iOS events share group.com.apartag.app');
  check(PLATFORM_LIMITS.appGroup === IOS_APP_GROUP, 'documented app group');
  check(PLATFORM_LIMITS.interceptsKey === IOS_INTERCEPTS_KEY, 'documented intercepts key');
  check(IOS_INTERCEPTS_KEY === 'appBlocker.pendingIntercepts.v1', 'queue key matches the shield extensions');
  check(INTERCEPT_DEBOUNCE_MS === 2_000, 'debounce matches the native 2s window');
  check(NATIVE_QUEUE_CAP === 200, 'native queue keeps 200 events');
  check(SEEN_CAP === NATIVE_QUEUE_CAP, 'seen keys cover one full native drain');
  check(RECENT_CAP === 8, 'the card keeps a short recent list');
  check(STORAGE_KEY === 'apartag.blockedAttempts.v1', 'counter storage stays off the main state key');
  check(PLATFORM_LIMITS.android.includes('overlay'), 'Android limit names the overlay');
  check(PLATFORM_LIMITS.android.includes('200'), 'Android limit names the queue cap');
  check(PLATFORM_LIMITS.ios.includes('ShieldAction'), 'iOS limit names the reliable shield path');
  check(PLATFORM_LIMITS.ios.includes('group.com.apartag.app'), 'iOS limit names the app group');
  check(PLATFORM_LIMITS.ios.includes('ShieldConfiguration'), 'iOS limit names the cached shield path');
  check(PLATFORM_LIMITS.unavailable.includes('Expo Go'), 'unavailable builds are documented');
  check(platformLimitKey('android') === 'attempts.limitAndroid', 'android copy key');
  check(platformLimitKey('ios') === 'attempts.limitIos', 'ios copy key');
  check(platformLimitKey('unavailable') === 'attempts.limitUnavailable', 'unavailable copy key');

  check(sanitizeIntercept(null) === null, 'null is not an event');
  check(sanitizeIntercept('instagram') === null, 'a string is not an event');
  check(sanitizeIntercept({}) === null, 'missing time is not an event');
  check(sanitizeIntercept({ interceptedAt: Number.NaN, appName: 'A' }) === null, 'NaN time');
  check(sanitizeIntercept({ interceptedAt: 0, appName: 'A' }) === null, 'zero time');
  check(sanitizeIntercept({ interceptedAt: -5, appName: 'A' }) === null, 'negative time');
  check(sanitizeIntercept({ interceptedAt: Number.POSITIVE_INFINITY, appName: 'A' }) === null, 'infinite time');
  check(sanitizeIntercept({ interceptedAt: 10, appName: 4 }) === null, 'numeric names are rejected');
  check(sanitizeIntercept({ interceptedAt: '20', appName: 'A' }) === null, 'string times are rejected');

  const named = sanitizeIntercept({ interceptedAt: 1_700_000_000_000.6, appName: '  TikTok  ' });
  check(named?.interceptedAt === 1_700_000_000_001, 'times are rounded to the millisecond');
  check(named?.appName === 'TikTok', 'names are trimmed');
  const unnamed = sanitizeIntercept({ interceptedAt: 50, appName: '   ' });
  check(unnamed?.appName === null, 'blank names become null');
  const missingName = sanitizeIntercept({ interceptedAt: 50, appName: null });
  check(missingName?.appName === null, 'null names stay null');
  check(eventKey(event(50, null)) === '50:', 'null names have a stable key');

  const first = mergeIntercepts(EMPTY_LEDGER, [
    { interceptedAt: 100, appName: 'Instagram' },
    { interceptedAt: 300, appName: null },
    { interceptedAt: -1, appName: 'Nope' },
    null,
    { interceptedAt: 300, appName: null },
  ]);
  check(first.total === 2, 'invalid and duplicate rows count once');
  check(first.recent[0]?.interceptedAt === 300, 'newest event is first');
  check(first.recent[1]?.appName === 'Instagram', 'older event follows');
  check(first.seen.length === 2, 'both keys are remembered');

  const replay = mergeIntercepts(first, [
    { interceptedAt: 100, appName: 'Instagram' },
    { interceptedAt: 300, appName: null },
  ]);
  check(replay === first, 'replaying the same events returns the same ledger');

  const added = mergeIntercepts(first, [{ interceptedAt: 500, appName: 'YouTube' }]);
  check(added !== first, 'a new event returns a new ledger');
  check(added.total === 3, 'the total only grows by new events');
  check(first.total === 2, 'merge does not mutate the previous total');
  check(first.recent.length === 2, 'merge does not mutate the previous list');
  check(first.seen.length === 2, 'merge does not mutate the previous keys');

  const burst: unknown[] = [];
  for (let index = 0; index < RECENT_CAP + 3; index += 1) {
    burst.push({ interceptedAt: 1_000 + index, appName: `App ${index}` });
  }
  const windowed = mergeIntercepts(EMPTY_LEDGER, burst);
  check(windowed.total === RECENT_CAP + 3, 'the lifetime total keeps events that leave the recent list');
  check(windowed.recent.length === RECENT_CAP, 'recent list is capped');
  check(windowed.recent[0]?.appName === `App ${RECENT_CAP + 2}`, 'the newest app stays visible');
  check(windowed.seen.length === RECENT_CAP + 3, 'seen keys keep the whole burst');

  const many: unknown[] = [];
  for (let index = 0; index < SEEN_CAP + 1; index += 1) {
    many.push({ interceptedAt: 10_000 + index, appName: 'A' });
  }
  const capped = mergeIntercepts(EMPTY_LEDGER, many);
  check(capped.total === SEEN_CAP + 1, 'total counts past the seen cap');
  check(capped.seen.length === SEEN_CAP, 'seen keys drop the oldest');
  check(!capped.seen.includes(eventKey(event(10_000, 'A'))), 'the oldest key was evicted');
  const replayedOldest = mergeIntercepts(capped, [{ interceptedAt: 10_000, appName: 'A' }]);
  check(replayedOldest.total === capped.total + 1, 'an evicted key can count again if it is replayed');

  check(mergeIntercepts(first, []) === first, 'an empty drain is a no-op');
  check(mergeIntercepts(first, null as unknown as readonly unknown[]) === first, 'a non-array drain is a no-op');

  const repaired = sanitizeLedger({
    total: 40.8,
    recent: [{ interceptedAt: 20, appName: 'Maps' }, { interceptedAt: 'nope' }, { interceptedAt: 40, appName: '' }],
    seen: ['40:', 12, ''],
  });
  check(repaired.total === 40, 'a stored total is floored and kept above the recent list');
  check(repaired.recent.length === 2, 'broken recent rows are dropped');
  check(repaired.recent[0]?.interceptedAt === 40, 'stored recent events are newest first');
  check(repaired.recent[0]?.appName === null, 'blank stored names become null');
  check(repaired.seen.includes('40:'), 'valid seen keys survive');
  check(repaired.seen.includes(eventKey(event(20, 'Maps'))), 'recent events are seeded into seen');

  const fromRecent = sanitizeLedger({
    total: 0,
    recent: [{ interceptedAt: 5, appName: 'X' }],
  });
  check(fromRecent.total === 1, 'a missing total cannot sit below the recent list');
  check(sanitizeLedger(null) === EMPTY_LEDGER, 'missing storage is the empty ledger');
  check(sanitizeLedger({ total: Number.NaN }).total === 0, 'NaN totals become zero');

  sameLedger(mergeIntercepts(repaired, [{ interceptedAt: 40, appName: null }]), repaired);
}
