import { Platform } from 'react-native';

import type { AndroidBlockableApp, IOSBlockedItem, PermissionStatus } from 'expo-app-blocker';

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

export async function applyAndroidOverlayTheme() {
  if (Platform.OS !== 'android') return;
  const blocker = await native();
  blocker.configureAndroid({
    overlayTitle: 'Estás en Tiempo',
    overlayText: '{appName} está bloqueada. Acerca el tag para desbloquear.',
    overlayBackgroundColor: '#0B0A09',
    overlayTitleColor: '#F7F1E8',
    overlayTextColor: '#9C8F7E',
    overlayTitleFontSize: 28,
    overlayTextFontSize: 16,
    overlaySpinnerColor: '#D4923A',
    notificationTitle: 'Tiempo',
    notificationText: '{appName} está bloqueada. Acerca el tag.',
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

export async function openAndroidPermissionScreens() {
  if (Platform.OS !== 'android') return;
  const blocker = await native();
  blocker.openOverlaySettings();
  setTimeout(() => blocker.openUsageStatsSettings(), 600);
}

export async function listAndroidApps(): Promise<AndroidBlockableApp[]> {
  if (Platform.OS !== 'android') return SUGGESTED;
  try {
    const installed = await (await native()).getInstalledApps();
    const byPkg = new Map(installed.map((app) => [app.packageName, app]));
    const suggested = SUGGESTED.map((app) => byPkg.get(app.packageName) ?? app);
    const rest = installed
      .filter((app) => !SUGGESTED.some((s) => s.packageName === app.packageName))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return [...suggested, ...rest];
  } catch {
    return SUGGESTED;
  }
}

export async function startAndroidBlock(packages: string[]) {
  if (Platform.OS !== 'android') return;
  const blocker = await native();
  blocker.setBlockedApps(packages);
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
  await blocker.setBlockConfiguration({ blockedItems: items, isActive: true });
}

export async function stopIosBlock() {
  if (Platform.OS !== 'ios') return;
  const blocker = await native();
  blocker.clearAllBlocks();
}

export { SUGGESTED };
