/**
 * Daily budget rules shared with UsageBudget.kt.
 * Strict or 0 minutes blocks immediately. A positive allowance blocks only
 * after today's foreground time is spent. A new local day clears the counter;
 * setting the clock back does not.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTs(rel) {
  const abs = path.join(root, rel);
  const source = fs.readFileSync(abs, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: false,
    },
    fileName: abs,
  }).outputText;
  const mod = { exports: {} };
  const runner = new Function('exports', 'require', 'module', output);
  runner(mod.exports, () => {
    throw new Error('usage-budget must stay free of imports');
  }, mod);
  return mod.exports;
}

const {
  USAGE_DEFAULT_MINUTES,
  USAGE_MAX_MINUTES,
  USAGE_MAX_TICK_DELTA_MS,
  allowanceMinutes,
  clampUsageMinutes,
  localDayKey,
  mergeUsedMs,
  remainingMinutesCeil,
  remainingUsageMs,
  rollUsageDay,
  sanitizeUsageBudget,
  shouldBlockUsage,
  stepUsageMinutes,
  tickDeltaMs,
} = loadTs('src/lib/usage-budget.ts');

const instagram = 'com.instagram.android';
const youtube = 'com.google.android.youtube';

const open = { strict: false, defaultMinutes: 15, overrides: {} };
assert.equal(allowanceMinutes({ ...open, strict: true, overrides: { [instagram]: 30 } }, instagram), 0);
assert.equal(allowanceMinutes(open, instagram), 15);
assert.equal(allowanceMinutes({ ...open, overrides: { [instagram]: 0 } }, instagram), 0);
assert.equal(allowanceMinutes({ ...open, overrides: { [instagram]: 10 } }, youtube), 15);
assert.equal(allowanceMinutes({ ...open, overrides: { [instagram]: 10 } }, instagram), 10);

const quarter = 15 * 60_000;
assert.equal(shouldBlockUsage(0, 0), true);
assert.equal(shouldBlockUsage(15, 0), false);
assert.equal(shouldBlockUsage(15, quarter - 1), false);
assert.equal(shouldBlockUsage(15, quarter), true);
assert.equal(shouldBlockUsage(15, quarter + 5), true);
assert.equal(shouldBlockUsage(15, -20), false);

assert.equal(remainingUsageMs(0, 0), 0);
assert.equal(remainingUsageMs(15, 60_000), quarter - 60_000);
assert.equal(remainingUsageMs(15, quarter + 1), 0);
assert.equal(remainingMinutesCeil(1), 1);
assert.equal(remainingMinutesCeil(60_000), 1);
assert.equal(remainingMinutesCeil(60_001), 2);
assert.equal(remainingMinutesCeil(0), 0);

assert.equal(mergeUsedMs(100, 50), 100);
assert.equal(mergeUsedMs(10, 80), 80);
assert.equal(mergeUsedMs(-5, Number.NaN), 0);
assert.equal(mergeUsedMs(0, 0), 0);

assert.equal(tickDeltaMs(1_000, 0), 0);
assert.equal(tickDeltaMs(2_500, 1_000), 1_500);
assert.equal(tickDeltaMs(200_000, 1_000), USAGE_MAX_TICK_DELTA_MS);
assert.equal(tickDeltaMs(500, 1_000), 0);

const used = { [instagram]: 1_000 };
assert.deepEqual(rollUsageDay(null, '2026-10-15', used), { day: '2026-10-15', used });
assert.deepEqual(rollUsageDay('2026-10-15', '2026-10-15', used), { day: '2026-10-15', used });
assert.deepEqual(rollUsageDay('2026-10-14', '2026-10-15', used), { day: '2026-10-15', used: {} });
assert.deepEqual(rollUsageDay('2026-10-16', '2026-10-15', used), { day: '2026-10-16', used });

assert.equal(localDayKey(new Date(2026, 9, 15, 23, 59)), '2026-10-15');
assert.equal(localDayKey(new Date(2026, 9, 16, 0, 0)), '2026-10-16');

assert.deepEqual(sanitizeUsageBudget(null), {
  strict: true,
  defaultMinutes: USAGE_DEFAULT_MINUTES,
  overrides: {},
});
assert.deepEqual(sanitizeUsageBudget({ strict: false, defaultMinutes: 9_999, overrides: { nope: 4 } }), {
  strict: false,
  defaultMinutes: USAGE_MAX_MINUTES,
  overrides: {},
});
assert.equal(sanitizeUsageBudget({ strict: false, defaultMinutes: -3 }).defaultMinutes, 0);
assert.deepEqual(sanitizeUsageBudget({ strict: false, overrides: { [instagram]: 12.4, 'bad id': 8 } }).overrides, {
  [instagram]: 12,
});
assert.equal(clampUsageMinutes(Number.NaN), 0);

assert.equal(stepUsageMinutes(15, 1), 20);
assert.equal(stepUsageMinutes(15, -1), 10);
assert.equal(stepUsageMinutes(5, -1), 5);
assert.equal(stepUsageMinutes(5, -1, 0), 0);
assert.equal(stepUsageMinutes(0, 1, 0), 5);
assert.equal(stepUsageMinutes(USAGE_MAX_MINUTES, 1), USAGE_MAX_MINUTES);

const budgetKt = fs.readFileSync(
  path.join(root, 'vendor/expo-app-blocker/android/src/main/java/expo/modules/appblocker/UsageBudget.kt'),
  'utf8',
);
assert.match(budgetKt, /const val MAX_MINUTES = 240/);
assert.match(budgetKt, /const val DEFAULT_MINUTES = 15/);
assert.match(budgetKt, /const val MAX_TICK_DELTA_MS = 60_000L/);
assert.match(budgetKt, /UsageStatsManager/);
assert.match(budgetKt, /queryAndAggregateUsageStats/);
assert.match(budgetKt, /totalTimeInForeground/);
assert.match(budgetKt, /totalTimeVisible/);
assert.match(budgetKt, /HOUR_OF_DAY, 0/);
assert.match(budgetKt, /usage_budget_used_ms/);
assert.match(budgetKt, /usage_budget_strict/);
assert.match(budgetKt, /getBoolean\(KEY_STRICT, true\)/);
assert.match(budgetKt, /\.commit\(\)/);
assert.match(budgetKt, /hasUsageAccess/);
assert.match(budgetKt, /if \(config\.strict\) return 0/);
assert.match(budgetKt, /if \(stored < today\)/);

const patch = fs.readFileSync(path.join(root, 'scripts/apply-android-blocker-patch.mjs'), 'utf8');
assert.match(patch, /UsageBudget\.kt/);

const store = fs.readFileSync(path.join(root, 'src/context/tiempo-store.tsx'), 'utf8');
assert.match(store, /syncUsageBudget\(budgetConfig\(next\)\)/);
assert.match(store, /syncUsageBudget\(budgetConfig\(current\)\)/);

const blocker = fs.readFileSync(path.join(root, 'src/lib/blocker.ts'), 'utf8');
assert.match(blocker, /androidLockDecision/);
assert.match(blocker, /syncUsageBudget/);

console.log('usage budget ok');
