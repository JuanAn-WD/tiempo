import {
  DAY_HOURS,
  HORIZON_AGE,
  clampManualHours,
  formatOneDecimal,
  hoursFromUsageMs,
  normalizeUsageResult,
  paceFromUsageMs,
  resolveCalculator,
  stepHours,
  yearsFromDailyHours,
} from './screen-years';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function close(actual: number, expected: number, message: string) {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${message}: ${actual} !== ${expected}`);
  }
}

export function testScreenYears() {
  check(DAY_HOURS === 24, 'the projection divides by a 24-hour day');
  check(HORIZON_AGE === 80, 'the horizon stays 80');

  close(yearsFromDailyHours(5, 30), (5 / 24) * 50, '5 h at 30 is 50 years of that pace');
  close(yearsFromDailyHours(0, 30), 0, 'zero hours is zero years');
  close(yearsFromDailyHours(24, 30), 50, 'a full day is every remaining year');
  close(yearsFromDailyHours(5, 80), 5 / 24, 'age 80 still counts one year');
  close(yearsFromDailyHours(5, 100), 5 / 24, 'past 80 still counts one year');
  close(yearsFromDailyHours(0.5, 14), (0.5 / 24) * 66, 'half an hour at 14');
  close(yearsFromDailyHours(3.2, 30), (3.2 / 24) * 50, 'a real reading is not snapped first');

  close(hoursFromUsageMs(0), 0, 'no usage');
  close(hoursFromUsageMs(-1), 0, 'negative usage');
  close(hoursFromUsageMs(Number.NaN), 0, 'NaN usage');
  close(hoursFromUsageMs(5 * 60 * 60 * 1000), 5, 'five hours in ms');
  close(hoursFromUsageMs(90 * 60 * 1000), 1.5, 'ninety minutes');

  const under = paceFromUsageMs(3.2 * 60 * 60 * 1000);
  close(under.hours, 3.2, 'under a day passes through');
  close(under.rawHours, 3.2, 'raw matches');
  check(under.capped === false, 'under a day is not capped');

  const over = paceFromUsageMs(30 * 60 * 60 * 1000);
  close(over.hours, 24, 'overlap caps the formula at 24 h');
  close(over.rawHours, 30, 'the raw total is kept for the note');
  check(over.capped === true, 'over a day is capped');

  close(clampManualHours(5), 5, '5 h stays');
  close(clampManualHours(0), 0.5, 'manual hours have a floor');
  close(clampManualHours(40), 24, 'manual hours stop at a full day');
  close(clampManualHours(Number.NaN), 0.5, 'bad manual hours fall back to the floor');

  close(stepHours(3.2, 1), 3.5, 'plus moves up to the next half hour');
  close(stepHours(3.2, -1), 3, 'minus moves down to the previous half hour');
  close(stepHours(3, 1), 3.5, 'plus from a step');
  close(stepHours(3, -1), 2.5, 'minus from a step');
  close(stepHours(24, 1), 24, 'plus stops at 24');
  close(stepHours(0.5, -1), 0.5, 'minus stops at 0.5');

  check(formatOneDecimal(10.4166, 'es') === '10,4', 'Spanish years use a comma');
  check(formatOneDecimal(10.4166, 'en') === '10.4', 'English years use a dot');
  check(formatOneDecimal(0.04, 'es') === '0,04', 'a few minutes stay visible');
  check(formatOneDecimal(0.04, 'en') === '0.04', 'a few minutes stay visible in English');

  check(normalizeUsageResult(null).status === 'denied', 'missing reading is denied');
  check(normalizeUsageResult({ granted: false, totalMs: 50 }).status === 'denied', 'not granted');
  check(normalizeUsageResult({ granted: true, totalMs: 90 }).totalMs === 90, 'ready ms');
  check(normalizeUsageResult({ granted: true, totalMs: -5 }).totalMs === 0, 'negative ms becomes 0');
  check(normalizeUsageResult({ granted: true }).totalMs === 0, 'missing ms becomes 0');
  check(normalizeUsageResult({ granted: true, totalMs: '120' }).totalMs === 120, 'numeric strings count');

  const measured = resolveCalculator({
    platform: 'android',
    reading: 'ready',
    totalMs: 3.2 * 60 * 60 * 1000,
    overrideHours: null,
    manualHours: 5,
  });
  check(measured.source === 'measured', 'a real reading is the source');
  close(measured.hours, 3.2, 'measured hours');
  check(measured.canUseToday === false, 'already using today');
  check(measured.canRequestUsage === false, 'permission already granted');
  close(yearsFromDailyHours(measured.hours, 30), (3.2 / 24) * 50, 'measured pace uses 24 h');

  const capped = resolveCalculator({
    platform: 'android',
    reading: 'ready',
    totalMs: 30 * 60 * 60 * 1000,
    overrideHours: null,
    manualHours: 5,
  });
  check(capped.source === 'capped', 'overlap is called out');
  close(capped.hours, 24, 'capped hours');
  close(capped.rawHours ?? 0, 30, 'raw hours stay on the note');

  const empty = resolveCalculator({
    platform: 'android',
    reading: 'ready',
    totalMs: 0,
    overrideHours: null,
    manualHours: 5,
  });
  check(empty.source === 'empty', 'a granted empty day stays manual');
  close(empty.hours, 5, 'empty day keeps the entered hours');

  const denied = resolveCalculator({
    platform: 'android',
    reading: 'denied',
    totalMs: 0,
    overrideHours: null,
    manualHours: 5,
  });
  check(denied.source === 'denied', 'missing permission');
  check(denied.canRequestUsage === true, 'Android can open usage access');
  close(denied.hours, 5, 'denied keeps manual hours');

  const ios = resolveCalculator({
    platform: 'ios',
    reading: 'unsupported',
    totalMs: 0,
    overrideHours: null,
    manualHours: 5,
  });
  check(ios.source === 'ios', 'iPhone stays manual');
  check(ios.canRequestUsage === false, 'iPhone has no usage-access screen');
  close(ios.hours, 5, 'iPhone default hours');

  const pending = resolveCalculator({
    platform: 'android',
    reading: 'pending',
    totalMs: 0,
    overrideHours: null,
    manualHours: 5,
  });
  check(pending.source === 'pending', 'wait before claiming a source');

  const unavailable = resolveCalculator({
    platform: 'android',
    reading: 'unavailable',
    totalMs: 0,
    overrideHours: null,
    manualHours: 5,
  });
  check(unavailable.source === 'unavailable', 'a build without the module stays manual');
  check(unavailable.canRequestUsage === false, 'settings would not feed this build');

  const web = resolveCalculator({
    platform: 'web',
    reading: 'unsupported',
    totalMs: 0,
    overrideHours: null,
    manualHours: 5,
  });
  check(web.source === 'manual', 'web is a manual entry');

  const edited = resolveCalculator({
    platform: 'android',
    reading: 'ready',
    totalMs: 3.2 * 60 * 60 * 1000,
    overrideHours: 4,
    manualHours: 5,
  });
  check(edited.source === 'manual', 'stepper wins over the reading');
  close(edited.hours, 4, 'override hours');
  check(edited.canUseToday === true, 'today can be restored');
  check(edited.canRequestUsage === false, 'override is not a permission prompt');
}
