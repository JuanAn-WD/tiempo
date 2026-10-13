/**
 * Years on screen if every day until 80 looks like today.
 * The day in the formula is 24 hours — the stats screen says so.
 * A native reading can replace the hours; the formula does not change.
 */

export const DAY_HOURS = 24;
export const HORIZON_AGE = 80;
export const MANUAL_MIN_HOURS = 0.5;
export const MANUAL_MAX_HOURS = 24;
export const MANUAL_STEP_HOURS = 0.5;
const HOUR_MS = 60 * 60 * 1000;

export type UsagePace = {
  /** Hours the 24-hour formula should use. Never above one full day. */
  hours: number;
  /** Uncapped hours from the summed foreground time. */
  rawHours: number;
  /** True when overlapping apps pushed the sum past 24 h. */
  capped: boolean;
};

export type CalculatorReading = 'pending' | 'unsupported' | 'unavailable' | 'denied' | 'ready';

export type CalculatorSource =
  | 'pending'
  | 'ios'
  | 'manual'
  | 'unavailable'
  | 'denied'
  | 'empty'
  | 'measured'
  | 'capped';

export type ResolvedCalculator = {
  hours: number;
  source: CalculatorSource;
  rawHours: number | null;
  canUseToday: boolean;
  canRequestUsage: boolean;
};

/** Same projection the stats screen has always used: (hours / 24) × years until 80. */
export function yearsFromDailyHours(dailyHours: number, age: number): number {
  const remaining = Math.max(1, HORIZON_AGE - age);
  return (dailyHours / DAY_HOURS) * remaining;
}

export function hoursFromUsageMs(totalMs: number): number {
  if (!Number.isFinite(totalMs) || totalMs <= 0) return 0;
  return totalMs / HOUR_MS;
}

/**
 * Foreground time summed across apps can exceed a real day when two apps
 * are on screen together. The projection never spends more than 24 h.
 */
export function paceFromUsageMs(totalMs: number): UsagePace {
  const rawHours = hoursFromUsageMs(totalMs);
  const capped = rawHours > DAY_HOURS;
  return {
    rawHours,
    hours: capped ? DAY_HOURS : rawHours,
    capped,
  };
}

export function clampManualHours(hours: number): number {
  if (!Number.isFinite(hours)) return MANUAL_MIN_HOURS;
  const clamped = Math.min(MANUAL_MAX_HOURS, Math.max(MANUAL_MIN_HOURS, hours));
  return Math.round(clamped * 10) / 10;
}

/** Move to the next or previous half-hour, staying inside the manual range. */
export function stepHours(current: number, direction: -1 | 1): number {
  const target =
    direction > 0
      ? Math.floor(current / MANUAL_STEP_HOURS + 1e-9) * MANUAL_STEP_HOURS + MANUAL_STEP_HOURS
      : Math.ceil(current / MANUAL_STEP_HOURS - 1e-9) * MANUAL_STEP_HOURS - MANUAL_STEP_HOURS;
  return clampManualHours(target);
}

export function formatOneDecimal(value: number, locale: 'es' | 'en'): string {
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.05 ? 2 : 1;
  const factor = 10 ** digits;
  const rounded = (Math.round(value * factor) / factor).toFixed(digits);
  return locale === 'es' ? rounded.replace('.', ',') : rounded;
}

export function normalizeUsageResult(result: { granted?: boolean; totalMs?: unknown } | null | undefined): {
  status: 'denied' | 'ready';
  totalMs: number;
} {
  if (!result?.granted) return { status: 'denied', totalMs: 0 };
  const totalMs = typeof result.totalMs === 'number' ? result.totalMs : Number(result.totalMs);
  if (!Number.isFinite(totalMs) || totalMs < 0) return { status: 'ready', totalMs: 0 };
  return { status: 'ready', totalMs };
}

/**
 * Pick the hours behind the years figure.
 * A real Android reading wins until the person moves the stepper.
 * iOS stays manual: daily usage only exists inside a DeviceActivityReport,
 * and that extension cannot hand a number back to this screen.
 */
export function resolveCalculator(input: {
  platform: 'ios' | 'android' | 'web';
  reading: CalculatorReading;
  totalMs: number;
  overrideHours: number | null;
  manualHours: number;
}): ResolvedCalculator {
  const measured = input.reading === 'ready' ? paceFromUsageMs(input.totalMs) : null;
  const hasMeasured = measured != null && measured.rawHours > 0;
  const manual = clampManualHours(input.manualHours);

  if (input.overrideHours != null) {
    return {
      hours: clampManualHours(input.overrideHours),
      source: 'manual',
      rawHours: measured?.rawHours ?? null,
      canUseToday: hasMeasured,
      canRequestUsage: false,
    };
  }

  if (measured?.capped) {
    return {
      hours: measured.hours,
      source: 'capped',
      rawHours: measured.rawHours,
      canUseToday: false,
      canRequestUsage: false,
    };
  }

  if (hasMeasured && measured) {
    return {
      hours: measured.hours,
      source: 'measured',
      rawHours: measured.rawHours,
      canUseToday: false,
      canRequestUsage: false,
    };
  }

  if (input.reading === 'ready') {
    return {
      hours: manual,
      source: 'empty',
      rawHours: 0,
      canUseToday: false,
      canRequestUsage: false,
    };
  }

  if (input.reading === 'denied') {
    return {
      hours: manual,
      source: 'denied',
      rawHours: null,
      canUseToday: false,
      canRequestUsage: input.platform === 'android',
    };
  }

  if (input.reading === 'pending') {
    return {
      hours: manual,
      source: 'pending',
      rawHours: null,
      canUseToday: false,
      canRequestUsage: false,
    };
  }

  if (input.platform === 'ios') {
    return {
      hours: manual,
      source: 'ios',
      rawHours: null,
      canUseToday: false,
      canRequestUsage: false,
    };
  }

  if (input.reading === 'unavailable') {
    return {
      hours: manual,
      source: 'unavailable',
      rawHours: null,
      canUseToday: false,
      canRequestUsage: false,
    };
  }

  return {
    hours: manual,
    source: 'manual',
    rawHours: null,
    canUseToday: false,
    canRequestUsage: false,
  };
}
