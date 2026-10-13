import { requireNativeModule } from 'expo';

export type UsageTodayNative = {
  granted: boolean;
  totalMs: number;
};

type UsageStatsNativeModule = {
  readToday(): Promise<UsageTodayNative>;
};

let native: UsageStatsNativeModule | null = null;

function module(): UsageStatsNativeModule {
  native ??= requireNativeModule<UsageStatsNativeModule>('UsageStats');
  return native;
}

/** Lazy: importing this file does not touch native code until the first read. */
export function readTodayNative(): Promise<UsageTodayNative> {
  return module().readToday();
}
