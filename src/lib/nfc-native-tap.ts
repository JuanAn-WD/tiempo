import { Platform } from 'react-native';

import { ownAppIds } from '@/lib/own-app';
import { applyNativeTapEvent } from '@/lib/nfc-tap-state';
import type { TiempoState } from '@/lib/storage';
import {
  acknowledgeNfcTap,
  readNfcTapSnapshot,
  syncNfcTapState,
  subscribeNfcTap,
} from '../../modules/nfc-tap';

export type NativeTapPull = {
  state: TiempoState;
  applied: 'lock' | 'unlock' | null;
};

/** Writes the paired UID and the saved package list. The HMAC phone key is not included. */
export function pushNfcTapState(state: TiempoState): void {
  if (Platform.OS !== 'android') return;
  try {
    syncNfcTapState({
      onboarded: state.onboarded,
      tagId: state.tagId,
      spareTagId: state.spareTagId,
      packages: state.selectedPackages,
      ownIds: ownAppIds(),
      locked: state.locked,
      lockedAt: state.lockedAt,
    });
  } catch {
    /* the native module is absent in Expo Go */
  }
}

/**
 * Applies one unacked tap, then writes the JS snapshot back.
 * A second call is a no-op once the event id has been acknowledged.
 */
export function pullNfcTapEvent(state: TiempoState): NativeTapPull {
  if (Platform.OS !== 'android') return { state, applied: null };
  let snap: ReturnType<typeof readNfcTapSnapshot>;
  try {
    snap = readNfcTapSnapshot();
  } catch {
    return { state, applied: null };
  }
  if (!snap || snap.pendingId <= snap.ackedId) {
    pushNfcTapState(state);
    return { state, applied: null };
  }
  if (snap.pendingAction !== 'lock' && snap.pendingAction !== 'unlock') {
    try {
      acknowledgeNfcTap(snap.pendingId);
    } catch {
      /* leave it pending */
    }
    pushNfcTapState(state);
    return { state, applied: null };
  }
  const at = snap.pendingAt > 0 ? snap.pendingAt : Date.now();
  const next = applyNativeTapEvent(state, { action: snap.pendingAction, at });
  try {
    acknowledgeNfcTap(snap.pendingId);
  } catch {
    return { state, applied: null };
  }
  pushNfcTapState(next);
  return { state: next, applied: snap.pendingAction };
}

export { subscribeNfcTap };
