import { Platform } from 'react-native';

import { normalizeUsageResult, type CalculatorReading } from '@/lib/screen-years';
import { readTodayNative } from '../../modules/usage-stats';

export type UsageReading =
  | { status: Exclude<CalculatorReading, 'ready'> }
  | { status: 'ready'; totalMs: number };

/**
 * Today's foreground time on Android, via UsageStatsManager.
 * iOS cannot supply this number without a DeviceActivityReport extension,
 * and that report cannot return a value to the app, so iPhone stays manual.
 * Expo Go and any build that predates the module resolve as unavailable.
 */
export async function readTodayUsage(): Promise<UsageReading> {
  if (Platform.OS !== 'android') return { status: 'unsupported' };
  try {
    const normalized = normalizeUsageResult(await readTodayNative());
    if (normalized.status === 'denied') return { status: 'denied' };
    return { status: 'ready', totalMs: normalized.totalMs };
  } catch {
    return { status: 'unavailable' };
  }
}
