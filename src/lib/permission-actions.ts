import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { readDeviceLocale, translate } from '@/i18n';
import {
  getPermissions,
  openOverlayPermission,
  openUsagePermission,
  requestNativePermissions,
} from '@/lib/blocker';
import { getNfcStatus, openNfcSettings } from '@/lib/nfc';
import {
  outcomeFromFamilyControls,
  outcomeFromFlag,
  outcomeFromNfc,
  outcomeFromPrompt,
  settingsTarget,
  type PermissionId,
  type PermissionSnapshot,
} from '@/lib/permission-flow';

export type CameraPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
} | null;

const NOT_USED: PermissionSnapshot = { outcome: 'notUsed', canAskAgain: false };
const UNAVAILABLE: PermissionSnapshot = { outcome: 'unavailable', canAskAgain: false };

export async function readPermission(
  id: PermissionId,
  attempted: boolean,
  camera: CameraPermissionState,
): Promise<PermissionSnapshot> {
  if (id === 'accessibility') return NOT_USED;
  if (id === 'camera') {
    if (!camera) return { outcome: 'undetermined', canAskAgain: true };
    return outcomeFromPrompt(camera.granted, camera.canAskAgain, camera.status);
  }
  if (id === 'nfc') return outcomeFromNfc(await getNfcStatus());
  if (id === 'screenTime') return readScreenTime();
  if (id === 'usage' || id === 'overlay') return readAndroidSetting(id, attempted);
  if (id === 'notifications') return readNotificationPermission();
  return UNAVAILABLE;
}

export async function readPermissions(
  ids: readonly PermissionId[],
  attempted: ReadonlySet<PermissionId>,
  camera: CameraPermissionState,
): Promise<Record<PermissionId, PermissionSnapshot>> {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await readPermission(id, attempted.has(id), camera)] as const),
  );
  return Object.fromEntries(entries) as Record<PermissionId, PermissionSnapshot>;
}

async function readScreenTime(): Promise<PermissionSnapshot> {
  if (Platform.OS !== 'ios') return UNAVAILABLE;
  try {
    const status = await getPermissions();
    if (!status || status.details.platform !== 'ios') return UNAVAILABLE;
    return outcomeFromFamilyControls(status.details.status, status.details.authorized);
  } catch {
    return UNAVAILABLE;
  }
}

async function readAndroidSetting(id: 'usage' | 'overlay', attempted: boolean): Promise<PermissionSnapshot> {
  if (Platform.OS !== 'android') return UNAVAILABLE;
  try {
    const status = await getPermissions();
    if (!status || status.details.platform !== 'android') return UNAVAILABLE;
    const granted = id === 'usage' ? status.details.usageStats : status.details.overlay;
    return outcomeFromFlag(granted, attempted);
  } catch {
    return UNAVAILABLE;
  }
}

async function notificationsApi() {
  return import('expo-notifications');
}

export async function readNotificationPermission(): Promise<PermissionSnapshot> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return UNAVAILABLE;
  try {
    const Notifications = await notificationsApi();
    const status = await Notifications.getPermissionsAsync();
    const provisional = status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return outcomeFromPrompt(status.granted || provisional, status.canAskAgain, status.status);
  } catch {
    return UNAVAILABLE;
  }
}

export async function requestNotificationPermission(): Promise<PermissionSnapshot> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return UNAVAILABLE;
  try {
    const Notifications = await notificationsApi();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('apartag-block', {
        name: translate(readDeviceLocale(), 'permissions.item.notifications.channel'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const currentProvisional = current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (current.granted || currentProvisional) return outcomeFromPrompt(true, false, 'granted');
    if (!current.canAskAgain && current.status === 'denied') return outcomeFromPrompt(false, false, 'denied');
    const next = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    const provisional = next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return outcomeFromPrompt(next.granted || provisional, next.canAskAgain, next.status);
  } catch {
    return UNAVAILABLE;
  }
}

/** Asks the system for this one permission. Does not open a second screen. */
export async function requestPermission(id: PermissionId): Promise<void> {
  try {
    if (id === 'screenTime') {
      await requestNativePermissions();
      return;
    }
    if (id === 'notifications') {
      await requestNotificationPermission();
    }
  } catch {
    /* the explainer stays up and shows the failure on the next read */
  }
}

export async function openPermissionSettings(id: PermissionId): Promise<void> {
  const target = settingsTarget(id);
  if (target === 'none') return;
  try {
    if (target === 'usage' && (await openUsagePermission())) return;
    if (target === 'overlay' && (await openOverlayPermission())) return;
    if (target === 'nfc' && (await openNfcSettings())) return;
    await Linking.openSettings();
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      /* leave the explanation on screen */
    }
  }
}
