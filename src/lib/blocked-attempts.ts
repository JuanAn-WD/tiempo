/**
 * Blocked-attempt counter. Free for every install — it is not a Pro feature.
 *
 * The phone records an attempt when someone opens a blocked app. This module
 * turns those native events into a lifetime total. It does not talk to the
 * native blocker; `blocked-attempts-sync` drains `drainPendingIntercepts()`
 * from `expo-app-blocker` and passes the rows here.
 *
 * Platform limits (expo-app-blocker 0.1.77):
 *
 * Android. The foreground service polls usage about every second, looking back
 * two minutes so a delayed usage event is still seen. When a
 * blocked app is in front and there is no earned-time unlock, it shows the
 * overlay and appends one event to SharedPreferences (`pending_intercepts`).
 * A 2 second debounce collapses the poll into one attempt. The app name is
 * the package label, or the package name when the label is missing. Counting
 * needs an active lock plus usage access and permission to draw over other
 * apps. Events wait on disk until Apartag drains them. The native queue keeps
 * at most 200; older ones are dropped. Expo Go has no native module, so new
 * attempts are not counted there.
 *
 * iOS. The shield extensions write a JSON queue in the shared app group
 * `group.com.apartag.app` under `appBlocker.pendingIntercepts.v1`. A tap on
 * the shield (ShieldAction) is the reliable signal: iOS caches the shield and
 * often does not run ShieldConfiguration again on the next open, so that path
 * is only best-effort. ShieldAction cannot read the app name, so those events
 * have none. The same 2 second debounce and 200 event cap apply. This needs
 * the Family Controls entitlement and the extension, so it does not run in
 * Expo Go or the Simulator.
 *
 * Web and any build where the native module is missing. The drain returns
 * nothing. A total already saved on the device still shows.
 *
 * Idempotency. Each event is keyed by timestamp and name. The last 200 keys
 * are remembered, matching the native cap, so draining the same queue twice
 * does not raise the total. An event older than that window can be counted
 * again if it is merged a second time after its key was dropped. The native
 * drain clears the queue, so that only happens for a replay from outside it.
 */

export const IOS_APP_GROUP = 'group.com.apartag.app';
export const IOS_INTERCEPTS_KEY = 'appBlocker.pendingIntercepts.v1';
export const INTERCEPT_DEBOUNCE_MS = 2_000;
export const NATIVE_QUEUE_CAP = 200;
export const RECENT_CAP = 8;
export const SEEN_CAP = NATIVE_QUEUE_CAP;
export const STORAGE_KEY = 'apartag.blockedAttempts.v1';

export const PLATFORM_LIMITS = {
  appGroup: IOS_APP_GROUP,
  interceptsKey: IOS_INTERCEPTS_KEY,
  debounceMs: INTERCEPT_DEBOUNCE_MS,
  nativeQueueCap: NATIVE_QUEUE_CAP,
  android:
    'Android counts an attempt when the blocker shows the overlay on a blocked app. The usage poll is debounced to one event per 2 seconds. The name is the package label. An active lock, usage access, and overlay permission are required. Events stay in SharedPreferences until drained, at most 200.',
  ios:
    'iOS counts an attempt when a shield extension writes the app group group.com.apartag.app. ShieldAction (a tap on the shield) is reliable. ShieldConfiguration is best-effort because iOS caches the shield. ShieldAction has no app name. Family Controls and the extension are required; Expo Go and the Simulator do not count. Debounce is 2 seconds and the queue caps at 200.',
  unavailable:
    'Web, Expo Go, and any build without the native blocker return no new events. A total already saved on the device still shows.',
} as const;

export type AttemptEvent = {
  appName: string | null;
  interceptedAt: number;
};

export type AttemptsLedger = {
  total: number;
  /** Newest first, capped at RECENT_CAP. */
  recent: AttemptEvent[];
  /** Keys of events already counted, oldest first, capped at SEEN_CAP. */
  seen: string[];
};

export type AttemptLimit = 'android' | 'ios' | 'unavailable';

export const EMPTY_LEDGER: AttemptsLedger = { total: 0, recent: [], seen: [] };

export function eventKey(event: AttemptEvent): string {
  return `${event.interceptedAt}:${event.appName ?? ''}`;
}

export function platformLimitKey(
  limit: AttemptLimit,
): 'attempts.limitAndroid' | 'attempts.limitIos' | 'attempts.limitUnavailable' {
  if (limit === 'android') return 'attempts.limitAndroid';
  if (limit === 'ios') return 'attempts.limitIos';
  return 'attempts.limitUnavailable';
}

export function sanitizeIntercept(raw: unknown): AttemptEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { appName?: unknown; interceptedAt?: unknown };
  if (typeof row.interceptedAt !== 'number' || !Number.isFinite(row.interceptedAt) || row.interceptedAt <= 0) {
    return null;
  }
  if (row.appName != null && typeof row.appName !== 'string') return null;
  const trimmed = typeof row.appName === 'string' ? row.appName.trim() : '';
  return {
    appName: trimmed.length > 0 ? trimmed : null,
    interceptedAt: Math.round(row.interceptedAt),
  };
}

function finiteTotal(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function uniqueKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.slice(-SEEN_CAP);
}

export function sanitizeLedger(raw: unknown): AttemptsLedger {
  if (!raw || typeof raw !== 'object') return EMPTY_LEDGER;
  const data = raw as Partial<AttemptsLedger>;
  const recent = (Array.isArray(data.recent) ? data.recent : [])
    .map(sanitizeIntercept)
    .filter((event): event is AttemptEvent => event !== null)
    .sort((a, b) => b.interceptedAt - a.interceptedAt)
    .slice(0, RECENT_CAP);
  const seen = (Array.isArray(data.seen) ? data.seen : []).filter(
    (key): key is string => typeof key === 'string' && key.length > 0,
  );
  return {
    total: Math.max(finiteTotal(data.total), recent.length),
    recent,
    seen: uniqueKeys([...seen, ...recent.map(eventKey)]),
  };
}

/**
 * Add new intercepts. Returns the same ledger when nothing new qualifies,
 * and never mutates the input.
 */
export function mergeIntercepts(ledger: AttemptsLedger, incoming: readonly unknown[]): AttemptsLedger {
  const rows = Array.isArray(incoming) ? incoming : [];
  const seen = new Set(ledger.seen);
  const accepted: AttemptEvent[] = [];
  for (const raw of rows) {
    const event = sanitizeIntercept(raw);
    if (!event) continue;
    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    accepted.push(event);
  }
  if (accepted.length === 0) return ledger;
  const recent = [...accepted, ...ledger.recent]
    .sort((a, b) => b.interceptedAt - a.interceptedAt)
    .slice(0, RECENT_CAP);
  return {
    total: ledger.total + accepted.length,
    recent,
    seen: [...ledger.seen, ...accepted.map(eventKey)].slice(-SEEN_CAP),
  };
}
