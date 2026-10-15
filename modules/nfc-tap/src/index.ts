import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

export type NfcTapSnapshot = {
  onboarded: boolean;
  tagId: string | null;
  spareTagId: string | null;
  locked: boolean;
  lockedAt: number;
  pendingId: number;
  pendingAction: string;
  pendingAt: number;
  ackedId: number;
};

export type NfcTapSyncInput = {
  onboarded: boolean;
  tagId: string | null;
  spareTagId: string | null;
  packages: string[];
  ownIds: string[];
  locked: boolean;
  lockedAt: number | null;
};

type NativeSnapshot = {
  onboarded: boolean;
  tagId: string;
  spareTagId: string;
  locked: boolean;
  lockedAt: number;
  pendingId: number;
  pendingAction: string;
  pendingAt: number;
  ackedId: number;
};

type NfcTapNative = {
  sync(
    onboarded: boolean,
    tagId: string,
    spareTagId: string,
    packages: string[],
    ownIds: string[],
    locked: boolean,
    lockedAt: number,
  ): void;
  read(): NativeSnapshot;
  acknowledge(pendingId: number): void;
  addListener(event: 'onTap', listener: () => void): { remove(): void };
};

let native: NfcTapNative | null | undefined;

function module(): NfcTapNative | null {
  if (Platform.OS !== 'android') return null;
  if (native !== undefined) return native;
  try {
    native = requireNativeModule<NfcTapNative>('NfcTap');
  } catch {
    native = null;
  }
  return native;
}

function emptyToNull(value: string): string | null {
  return value ? value : null;
}

/** Copies the paired tag and the block list into native prefs. No-op off Android. */
export function syncNfcTapState(input: NfcTapSyncInput): void {
  const current = module();
  if (!current) return;
  current.sync(
    input.onboarded,
    input.tagId ?? '',
    input.spareTagId ?? '',
    input.packages,
    input.ownIds,
    input.locked,
    input.lockedAt ?? 0,
  );
}

export function readNfcTapSnapshot(): NfcTapSnapshot | null {
  const current = module();
  if (!current) return null;
  const raw = current.read();
  return {
    onboarded: raw.onboarded === true,
    tagId: emptyToNull(raw.tagId ?? ''),
    spareTagId: emptyToNull(raw.spareTagId ?? ''),
    locked: raw.locked === true,
    lockedAt: Number(raw.lockedAt) || 0,
    pendingId: Number(raw.pendingId) || 0,
    pendingAction: typeof raw.pendingAction === 'string' ? raw.pendingAction : '',
    pendingAt: Number(raw.pendingAt) || 0,
    ackedId: Number(raw.ackedId) || 0,
  };
}

export function acknowledgeNfcTap(pendingId: number): void {
  const current = module();
  if (!current || !Number.isFinite(pendingId)) return;
  current.acknowledge(pendingId);
}

/** Fires when the invisible activity toggles the lock while JS is alive. */
export function subscribeNfcTap(listener: () => void): () => void {
  const current = module();
  if (!current) return () => {};
  const subscription = current.addListener('onTap', listener);
  return () => subscription.remove();
}
