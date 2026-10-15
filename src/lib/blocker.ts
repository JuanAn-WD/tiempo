import { Platform } from 'react-native';

import type { AndroidBlockableApp, IOSBlockedItem, PermissionStatus } from 'expo-app-blocker';

import type { Locale } from '@/i18n/locale';
import { translate } from '@/i18n/translate';
import { androidLockDecision, type AndroidLockDecision } from '@/lib/android-lock';
import { ownAppIds } from '@/lib/own-app';
import { guardIosSelection, withoutOwnPackages } from '@/lib/self-block';
import type { UsageBudgetConfig } from '@/lib/usage-budget';

type AndroidBlockerModule = typeof import('expo-app-blocker') & {
  isMonitoring?: () => boolean;
  isIgnoringBatteryOptimizations?: () => boolean;
  openBatterySettings?: () => void;
  setUsageBudget?: (config: UsageBudgetConfig) => void;
  getUsageBudgetStatus?: (packages: string[]) => {
    usageGranted: boolean;
    apps: { packageName: string; usedMs: number }[];
  };
};

export type AndroidStartResult = 'started' | 'permissions' | 'no-apps' | 'failed';

export type AndroidDiagnostics = {
  usage: boolean | null;
  overlay: boolean | null;
  notifications: boolean | null;
  batteryUnrestricted: boolean | null;
  serviceRunning: boolean | null;
  selectedApps: number;
};

const SUGGESTED = [
  { packageName: 'com.instagram.android', name: 'Instagram' },
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok' },
  { packageName: 'com.google.android.youtube', name: 'YouTube' },
  { packageName: 'com.twitter.android', name: 'X' },
  { packageName: 'com.facebook.katana', name: 'Facebook' },
  { packageName: 'com.reddit.frontpage', name: 'Reddit' },
  { packageName: 'com.snapchat.android', name: 'Snapchat' },
];

async function native(): Promise<AndroidBlockerModule> {
  return import('expo-app-blocker');
}

export async function requestAndroidNotifications() {
  if (Platform.OS !== 'android') return;
  await requestNotificationsBestEffort();
}

async function requestNotificationsBestEffort() {
  try {
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return;
    await Notifications.requestPermissionsAsync();
  } catch {
    /* the overlay still blocks when notifications stay off */
  }
}

export async function applyAndroidOverlayTheme(locale: Locale = 'es') {
  if (Platform.OS !== 'android') return;
  const blocker = await native();
  blocker.configureAndroid({
    overlayTitle: translate(locale, 'native.overlayTitle'),
    overlayText: translate(locale, 'native.overlayText'),
    overlayBackgroundColor: '#0B0A09',
    overlayTitleColor: '#F7F1E8',
    overlayTextColor: '#9C8F7E',
    overlayTitleFontSize: 28,
    overlayTextFontSize: 16,
    overlaySpinnerColor: '#D4923A',
    notificationTitle: translate(locale, 'native.overlayNotificationTitle'),
    notificationText: translate(locale, 'native.overlayNotificationText'),
  });
}

export async function getPermissions(): Promise<PermissionStatus | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  try {
    return (await native()).getPermissionStatus();
  } catch {
    return null;
  }
}

export async function requestNativePermissions(): Promise<PermissionStatus | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  try {
    return (await native()).requestPermissions();
  } catch {
    return null;
  }
}

export async function openOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    (await native()).openOverlaySettings();
    return true;
  } catch {
    return false;
  }
}

export async function openUsagePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    (await native()).openUsageStatsSettings();
    return true;
  } catch {
    return false;
  }
}

export async function listAndroidApps(locale: Locale = 'es'): Promise<AndroidBlockableApp[]> {
  if (Platform.OS !== 'android') return SUGGESTED;
  try {
    const installed = await (await native()).getInstalledApps();
    const byPkg = new Map(installed.map((app) => [app.packageName, app]));
    const suggested = SUGGESTED.map((app) => byPkg.get(app.packageName) ?? app);
    const rest = installed
      .filter((app) => !SUGGESTED.some((s) => s.packageName === app.packageName))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    const apps = [...suggested, ...rest];
    const allowed = new Set(withoutOwnPackages(apps.map((app) => app.packageName), ownAppIds()));
    return apps.filter((app) => allowed.has(app.packageName));
  } catch {
    return SUGGESTED;
  }
}

export async function syncUsageBudget(config: UsageBudgetConfig): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    (await native()).setUsageBudget?.(config);
  } catch {
    /* Expo Go and web have no UsageBudget prefs */
  }
}

export type UsageBudgetReading =
  | { status: 'unavailable' }
  | { status: 'ready'; usageGranted: boolean; usedMs: Record<string, number> };

/** Today's foreground time. `usageGranted` is the same usage-access check as the lock. */
export async function readUsageBudget(packages: string[]): Promise<UsageBudgetReading> {
  if (Platform.OS !== 'android') return { status: 'unavailable' };
  try {
    const status = (await native()).getUsageBudgetStatus?.(packages);
    if (!status) return { status: 'unavailable' };
    const usedMs: Record<string, number> = {};
    for (const row of status.apps) {
      if (typeof row.usedMs === 'number' && row.usedMs > 0) usedMs[row.packageName] = row.usedMs;
    }
    return { status: 'ready', usageGranted: status.usageGranted, usedMs };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function startAndroidBlock(packages: string[]): Promise<AndroidStartResult> {
  if (Platform.OS !== 'android') return 'started';
  try {
    const perms = await getPermissions();
    const details = perms?.details.platform === 'android' ? perms.details : null;
    const decision: AndroidLockDecision = androidLockDecision({
      packages,
      ownIds: ownAppIds(),
      usage: details?.usageStats === true,
      overlay: details?.overlay === true,
    });
    if (!decision.ok) return decision.reason;
    await requestNotificationsBestEffort();
    const blocker = await native();
    blocker.setBlockedApps(decision.packages);
    blocker.startMonitoring();
    return 'started';
  } catch {
    return 'failed';
  }
}

export async function readAndroidDiagnostics(selectedApps: number): Promise<AndroidDiagnostics> {
  const empty: AndroidDiagnostics = {
    usage: null,
    overlay: null,
    notifications: null,
    batteryUnrestricted: null,
    serviceRunning: null,
    selectedApps,
  };
  if (Platform.OS !== 'android') return empty;
  try {
    const blocker = await native();
    const status = await blocker.getPermissionStatus();
    const details = status.details.platform === 'android' ? status.details : null;
    return {
      usage: details?.usageStats ?? null,
      overlay: details?.overlay ?? null,
      notifications: details?.notifications ?? null,
      batteryUnrestricted:
        typeof blocker.isIgnoringBatteryOptimizations === 'function'
          ? blocker.isIgnoringBatteryOptimizations()
          : null,
      serviceRunning: typeof blocker.isMonitoring === 'function' ? blocker.isMonitoring() : null,
      selectedApps,
    };
  } catch {
    return empty;
  }
}

export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const blocker = await native();
    blocker.openBatterySettings?.();
  } catch {
    /* leave the diagnostics row on screen */
  }
}

export async function stopAndroidBlock() {
  if (Platform.OS !== 'android') return;
  const blocker = await native();
  blocker.setBlockedApps([]);
  blocker.stopMonitoring();
}

export async function startIosBlock(items: IOSBlockedItem[]) {
  if (Platform.OS !== 'ios') return;
  const blocker = await native();
  const blockedItems = guardIosSelection(items, ownAppIds()).items;
  await blocker.setBlockConfiguration({ blockedItems, isActive: true });
}

export async function stopIosBlock() {
  if (Platform.OS !== 'ios') return;
  const blocker = await native();
  blocker.clearAllBlocks();
}

export { SUGGESTED };
