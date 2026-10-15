/**
 * Daily usage budget. The Android service in `UsageBudget.kt` applies the
 * same rules: strict (or 0 minutes) blocks immediately, otherwise the app
 * stays usable until today's foreground time is spent. A later local day
 * clears the counter. Turning the clock back does not.
 *
 * Free. It is not an Apartag Pro feature.
 */

export const USAGE_MINUTE_STEP = 5;
export const USAGE_MAX_MINUTES = 240;
export const USAGE_DEFAULT_MINUTES = 15;
/** One poll must not invent more than a minute if the clock jumps. */
export const USAGE_MAX_TICK_DELTA_MS = 60_000;

export type UsageBudgetConfig = {
  /** No allowance. Budget is 0 and the app is blocked as soon as it opens. */
  strict: boolean;
  /** Minutes per day when an app has no override. Ignored while strict. */
  defaultMinutes: number;
  /** Per-app minutes. A missing key uses `defaultMinutes`. 0 blocks that app. */
  overrides: Record<string, number>;
};

export const DEFAULT_USAGE_BUDGET: UsageBudgetConfig = {
  strict: true,
  defaultMinutes: USAGE_DEFAULT_MINUTES,
  overrides: {},
};

const PACKAGE_NAME = /^[A-Za-z][\w]*(\.[A-Za-z][\w]*)+$/;

export function isUsagePackageName(value: string): boolean {
  return PACKAGE_NAME.test(value);
}

export function clampUsageMinutes(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(USAGE_MAX_MINUTES, Math.max(0, Math.round(value)));
}

export function stepUsageMinutes(current: number, direction: -1 | 1, min = USAGE_MINUTE_STEP): number {
  const floor = clampUsageMinutes(min);
  const snapped = Math.round(clampUsageMinutes(current) / USAGE_MINUTE_STEP) * USAGE_MINUTE_STEP;
  const next = snapped + direction * USAGE_MINUTE_STEP;
  return clampUsageMinutes(Math.max(floor, next));
}

export function sanitizeUsageOverrides(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const overrides: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isUsagePackageName(key)) continue;
    if (typeof value !== 'number') continue;
    overrides[key] = clampUsageMinutes(value);
  }
  return overrides;
}

export function sanitizeUsageBudget(raw: unknown): UsageBudgetConfig {
  const data = raw && typeof raw === 'object' ? (raw as Partial<UsageBudgetConfig>) : {};
  const defaultMinutes =
    typeof data.defaultMinutes === 'number' ? clampUsageMinutes(data.defaultMinutes) : USAGE_DEFAULT_MINUTES;
  return {
    strict: data.strict !== false,
    defaultMinutes,
    overrides: sanitizeUsageOverrides(data.overrides),
  };
}

/** Minutes allowed today. Strict, or a non-positive budget, means block now. */
export function allowanceMinutes(config: UsageBudgetConfig, packageName: string): number {
  if (config.strict) return 0;
  const override = config.overrides[packageName];
  const minutes = override === undefined ? config.defaultMinutes : override;
  return clampUsageMinutes(minutes);
}

export function shouldBlockUsage(allowance: number, usedMs: number): boolean {
  if (allowance <= 0) return true;
  const used = Number.isFinite(usedMs) ? Math.max(0, usedMs) : 0;
  return used >= allowance * 60_000;
}

export function remainingUsageMs(allowance: number, usedMs: number): number {
  if (allowance <= 0) return 0;
  const used = Number.isFinite(usedMs) ? Math.max(0, usedMs) : 0;
  return Math.max(0, allowance * 60_000 - used);
}

/** Ceil so a leftover of a few seconds still reads as one minute. */
export function remainingMinutesCeil(remainingMs: number): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 60_000);
}

/**
 * Persisted ticks and UsageStats can each miss a slice. The higher reading
 * is the one that has seen more of today.
 */
export function mergeUsedMs(persistedMs: number, statsMs: number): number {
  const persisted = Number.isFinite(persistedMs) ? Math.max(0, persistedMs) : 0;
  const stats = Number.isFinite(statsMs) ? Math.max(0, statsMs) : 0;
  return Math.max(persisted, stats);
}

export function tickDeltaMs(now: number, previous: number): number {
  if (!Number.isFinite(now) || !Number.isFinite(previous) || previous <= 0) return 0;
  const delta = now - previous;
  if (delta <= 0) return 0;
  return Math.min(delta, USAGE_MAX_TICK_DELTA_MS);
}

/** Local calendar day, `YYYY-MM-DD`. Midnight is the device timezone. */
export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * A new local day clears usage. A clock set backwards keeps the counter
 * and the later day key, so the budget does not refill early.
 */
export function rollUsageDay(
  storedDay: string | null,
  today: string,
  used: Record<string, number>,
): { day: string; used: Record<string, number> } {
  if (!storedDay || storedDay === today) return { day: today, used };
  if (storedDay < today) return { day: today, used: {} };
  return { day: storedDay, used };
}
