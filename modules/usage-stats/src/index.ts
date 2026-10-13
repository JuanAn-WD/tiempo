import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

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

/**
 * Lazy: importing this file does not touch native code until the first read.
 * Web and iOS never reach the native module.
 */
export function readTodayNative(): Promise<UsageTodayNative> {
  if (Platform.OS !== 'android') {
    return Promise.reject(new Error('Usage stats are only on a device'));
  }
  return module().readToday();
}
