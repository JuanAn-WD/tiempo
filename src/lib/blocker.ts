import { Platform } from 'react-native';

import type { AndroidBlockableApp, IOSBlockedItem, PermissionStatus } from 'expo-app-blocker';

import type { Locale } from '@/i18n/locale';
import { translate } from '@/i18n/translate';
import { ownAppIds } from '@/lib/own-app';
import { guardIosSelection, withoutOwnPackages } from '@/lib/self-block';

const SUGGESTED = [
  { packageName: 'com.instagram.android', name: 'Instagram' },
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok' },
  { packageName: 'com.google.android.youtube', name: 'YouTube' },
  { packageName: 'com.twitter.android', name: 'X' },
  { packageName: 'com.facebook.katana', name: 'Facebook' },
  { packageName: 'com.reddit.frontpage', name: 'Reddit' },
  { packageName: 'com.snapchat.android', name: 'Snapchat' },
];

async function native() {
  return import('expo-app-blocker');
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

export async function startAndroidBlock(packages: string[]) {
  if (Platform.OS !== 'android') return;
  const blocker = await native();
  blocker.setBlockedApps(withoutOwnPackages(packages, ownAppIds()));
  blocker.startMonitoring();
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
