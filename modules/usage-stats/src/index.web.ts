export type UsageTodayNative = {
  granted: boolean;
  totalMs: number;
};

/** Web has no UsageStatsManager. Callers should treat this as unavailable. */
export function readTodayNative(): Promise<UsageTodayNative> {
  return Promise.reject(new Error('Usage stats are only on a device'));
}
