import type { ReactNode } from 'react';

/**
 * Web stand-in for expo-app-blocker. The real module calls
 * `requireNativeModule('ExpoAppBlocker')` as soon as it loads, which throws
 * in the browser. None of these calls lock anything.
 */

const unsupported = () => {
  throw new Error('App locking is only on a device');
};

export async function getPermissionStatus() {
  return unsupported();
}

export async function requestPermissions() {
  return unsupported();
}

export function openOverlaySettings(): void {}

export function openUsageStatsSettings(): void {}

export async function getInstalledApps(): Promise<never[]> {
  return [];
}

export function setBlockedApps(_packages: string[]): void {}

export function getBlockedApps(): string[] {
  return [];
}

export function configureAndroid(_config: unknown): void {}

export function startMonitoring(): void {}

export function stopMonitoring(): void {}

export async function presentFamilyActivityPicker(): Promise<never> {
  return unsupported();
}

export async function setBlockConfiguration(_config: unknown): Promise<void> {}

export function getBlockConfiguration(): null {
  return null;
}

export function clearAllBlocks(): void {}

export function isAppBlocked(_id: string): boolean {
  return false;
}

export async function temporaryUnlock(_minutes?: number): Promise<{ unlocked: false }> {
  return { unlocked: false };
}

export function isTemporarilyUnlocked(): boolean {
  return false;
}

export function getRemainingUnlockTime(): number {
  return 0;
}

export async function relockApps(): Promise<{ locked: false }> {
  return { locked: false };
}

export function checkAndClearPendingUnlock(): boolean {
  return false;
}

export function restartAppForRecovery(_deepLink?: string): void {}

export function drainPendingIntercepts(): never[] {
  return [];
}

export function addPendingUnlockListener(_handler: () => void): null {
  return null;
}

export function BlockedAppsNativeList(_props: {
  items?: unknown;
  selectionData?: string;
  style?: unknown;
}): ReactNode {
  return null;
}

export function FamilyActivityPickerView(_props: {
  initialSelection?: string;
  onSelectionChange?: (event: { selectionData: string; items: unknown[] }) => void;
  theme?: string;
  style?: unknown;
  clearTrigger?: number;
}): ReactNode {
  return null;
}
