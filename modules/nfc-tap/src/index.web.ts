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

export function syncNfcTapState(_input: NfcTapSyncInput): void {}

export function readNfcTapSnapshot(): NfcTapSnapshot | null {
  return null;
}

export function acknowledgeNfcTap(_pendingId: number): void {}

export function subscribeNfcTap(_listener: () => void): () => void {
  return () => {};
}
