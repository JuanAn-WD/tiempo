import Constants from 'expo-constants';
import { useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useTiempo } from '@/context/tiempo-store';
import {
  EMPTY_STORE_REVIEW_RECORD,
  INITIAL_REVIEW_ARM,
  REVIEW_PRESENT_DELAY_MS,
  armStoreReview,
  isAppForeground,
  markReviewRequested,
  normalizeAppVersion,
  reviewDecisionDefers,
  shouldRequestStoreReview,
  type ReviewArmState,
} from '@/lib/store-review';
import { requestNativeStoreReview } from '@/lib/store-review-native';
import { loadStoreReviewRecord, saveStoreReviewRecord } from '@/lib/store-review-storage';

function readAppVersion(): string {
  return normalizeAppVersion(Constants.expoConfig?.version);
}

/**
 * Asks for a native store review after a qualifying focus session.
 * Renders nothing: the sheet belongs to the OS, in the device language.
 */
export function StoreReviewPrompt() {
  const { ready, state } = useTiempo();
  const segments = useSegments();
  const route = segments[0];
  const [appActive, setAppActive] = useState(() => isAppForeground(AppState.currentState));
  const armRef = useRef<ReviewArmState>(INITIAL_REVIEW_ARM);
  const ticket = useRef(0);
  const inflight = useRef(false);
  const liveRef = useRef({
    locked: state.locked,
    route,
    appActive,
    sessions: state.sessions,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      setAppActive(isAppForeground(status));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Bump on every pass so a lock or emergency that arrives mid-request cancels it.
    const generation = ++ticket.current;
    liveRef.current = { locked: state.locked, route, appActive, sessions: state.sessions };
    armRef.current = armStoreReview(armRef.current, state.sessions);
    if (!armRef.current.pending) return;

    const appVersion = readAppVersion();
    const early = shouldRequestStoreReview({
      ...liveRef.current,
      record: EMPTY_STORE_REVIEW_RECORD,
      appVersion,
      now: Date.now(),
    });
    if (early !== 'ask') {
      if (!reviewDecisionDefers(early)) {
        armRef.current = { ...armRef.current, pending: false };
      }
      return;
    }

    const timer = setTimeout(() => {
      if (generation !== ticket.current || inflight.current) return;
      inflight.current = true;
      void (async () => {
        try {
          const record = await loadStoreReviewRecord();
          if (generation !== ticket.current) return;
          const live = liveRef.current;
          const now = Date.now();
          const decision = shouldRequestStoreReview({
            ...live,
            record,
            appVersion,
            now,
          });
          if (decision !== 'ask') {
            if (!reviewDecisionDefers(decision)) {
              armRef.current = { ...armRef.current, pending: false };
            }
            return;
          }
          armRef.current = { ...armRef.current, pending: false };
          const presented = await requestNativeStoreReview();
          if (!presented) return;
          await saveStoreReviewRecord(markReviewRequested(record, appVersion, now));
        } catch {
          /* a failed read or write can try again on the next session */
        } finally {
          inflight.current = false;
        }
      })();
    }, REVIEW_PRESENT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [appActive, ready, route, state.locked, state.sessions]);

  return null;
}
