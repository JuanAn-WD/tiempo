import {
  finishTransaction,
  getAvailablePurchases,
  useIAP,
  type Purchase,
} from 'expo-iap';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';

import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { loadProEntitlement, saveProEntitlement } from '@/lib/pro-storage';
import {
  PRO_IS_CONSUMABLE,
  PRO_PRODUCT_ID,
  classifyStoreError,
  displayPrice,
  entitlementFromPurchase,
  gateProFeature,
  isProPurchase,
  priceFromProducts,
  proPurchaseRequest,
  reconcileEntitlement,
  storeErrorCode,
  syncFromPurchases,
  toPurchaseSnapshot,
  type ProEntitlement,
  type ProGate,
} from '@/lib/purchases';

export type ProNotice =
  | 'pending'
  | 'restore-done'
  | 'restore-empty'
  | 'restore-kept'
  | 'restore-fail'
  | 'purchase-fail'
  | 'unavailable'
  | 'missing-product'
  | 'revoked';

export type RestoreOutcome = 'restored' | 'empty' | 'failed';

type ProContextValue = {
  ready: boolean;
  isPro: boolean;
  entitlement: ProEntitlement | null;
  /** Localized store price, or null until the store answers. */
  storePrice: string | null;
  /** Store price, or the 4.99 catalog label for this language. */
  priceLabel: string;
  busy: 'buy' | 'restore' | null;
  /** False on web, where the stores are not available. */
  storeAvailable: boolean;
  notice: ProNotice | null;
  clearNotice: () => void;
  buy: () => Promise<void>;
  restore: () => Promise<RestoreOutcome>;
  /**
   * For a later Pro feature. Returns true when it may run.
   * Opens the Pro screen only when the session is not locked.
   */
  requirePro: () => boolean;
  /** Settings entry. A locked session does not open the paywall. */
  openPro: () => boolean;
};

const ProContext = createContext<ProContextValue | null>(null);

function useEntitlementCache() {
  const [entitlement, setEntitlementState] = useState<ProEntitlement | null>(null);
  const [ready, setReady] = useState(false);
  const entitlementRef = useRef<ProEntitlement | null>(null);

  const setEntitlement = useCallback((next: ProEntitlement | null) => {
    entitlementRef.current = next;
    setEntitlementState(next);
  }, []);

  useEffect(() => {
    let live = true;
    void loadProEntitlement().then((value) => {
      if (!live) return;
      setEntitlement(value);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [setEntitlement]);

  return { entitlement, entitlementRef, ready, setEntitlement };
}

function useProActions(store: {
  available: boolean;
  storePrice: string | null;
  buy: () => Promise<void>;
  restore: () => Promise<RestoreOutcome>;
  notice: ProNotice | null;
  setNotice: (notice: ProNotice | null) => void;
  busy: 'buy' | 'restore' | null;
  entitlement: ProEntitlement | null;
  ready: boolean;
}) {
  const { state } = useTiempo();
  const { locale, t } = useI18n();
  const router = useRouter();
  const priceLabel = displayPrice(store.storePrice, locale);

  const openPro = useCallback(() => {
    const decision: ProGate = gateProFeature({
      entitled: store.entitlement !== null,
      locked: state.locked,
    });
    if (decision === 'locked') {
      Alert.alert(t('pro.lockedTitle'), t('pro.lockedBody'));
      return false;
    }
    router.push('/pro');
    return true;
  }, [router, state.locked, store.entitlement, t]);

  const requirePro = useCallback(() => {
    const decision = gateProFeature({
      entitled: store.entitlement !== null,
      locked: state.locked,
    });
    if (decision === 'allow') return true;
    if (decision === 'locked') {
      Alert.alert(t('pro.lockedTitle'), t('pro.lockedBody'));
      return false;
    }
    router.push('/pro');
    return false;
  }, [router, state.locked, store.entitlement, t]);

  return useMemo<ProContextValue>(
    () => ({
      ready: store.ready,
      isPro: store.entitlement !== null,
      entitlement: store.entitlement,
      storePrice: store.storePrice,
      priceLabel,
      busy: store.busy,
      storeAvailable: store.available,
      notice: store.notice,
      clearNotice: () => store.setNotice(null),
      buy: store.buy,
      restore: store.restore,
      requirePro,
      openPro,
    }),
    [openPro, priceLabel, requirePro, store],
  );
}

function NativeProProvider({ children }: { children: ReactNode }) {
  const { entitlement, entitlementRef, ready, setEntitlement } = useEntitlementCache();
  const [busy, setBusyState] = useState<'buy' | 'restore' | null>(null);
  const [notice, setNotice] = useState<ProNotice | null>(null);
  const busyRef = useRef<'buy' | 'restore' | null>(null);
  const buyingRef = useRef(false);

  const onPurchaseRef = useRef<(purchase: Purchase) => void>(() => {});
  const onErrorRef = useRef<(error: unknown) => void>(() => {});
  const runRestoreRef = useRef<() => Promise<RestoreOutcome>>(async () => 'failed');

  const iap = useIAP({
    onPurchaseSuccess: (purchase) => {
      onPurchaseRef.current(purchase);
    },
    onPurchaseError: (error) => {
      onErrorRef.current(error);
    },
  });

  const setBusy = useCallback((value: 'buy' | 'restore' | null) => {
    busyRef.current = value;
    setBusyState(value);
  }, []);

  const finishOwned = useCallback(async (purchases: Purchase[]) => {
    for (const purchase of purchases) {
      if (!isProPurchase(toPurchaseSnapshot(purchase))) continue;
      try {
        await finishTransaction({ purchase, isConsumable: PRO_IS_CONSUMABLE });
      } catch {
        // An already-finished non-consumable still counts as owned.
      }
    }
  }, []);

  const runRestore = useCallback(async (): Promise<RestoreOutcome> => {
    setBusy('restore');
    setNotice(null);
    try {
      if (!iap.connected) {
        const ok = await iap.reconnect();
        if (!ok) {
          setNotice('unavailable');
          return 'failed';
        }
      }
      await iap.restorePurchases();
      const purchases = await getAvailablePurchases();
      const snapshot = purchases.map(toPurchaseSnapshot);
      const sync = syncFromPurchases(snapshot, Date.now());
      if (sync.status === 'revoked') {
        await saveProEntitlement(null);
        setEntitlement(null);
        setNotice('revoked');
        return 'empty';
      }
      if (sync.status !== 'owned') {
        setNotice(entitlementRef.current ? 'restore-kept' : 'restore-empty');
        return entitlementRef.current ? 'restored' : 'empty';
      }
      const next = reconcileEntitlement(entitlementRef.current, sync);
      await saveProEntitlement(next);
      setEntitlement(next);
      await finishOwned(purchases);
      setNotice('restore-done');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return 'restored';
    } catch (error) {
      const kind = classifyStoreError(storeErrorCode(error));
      setNotice(kind === 'unavailable' ? 'unavailable' : 'restore-fail');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return 'failed';
    } finally {
      setBusy(null);
    }
  }, [entitlementRef, finishOwned, iap, setBusy, setEntitlement]);

  const onPurchase = useCallback(
    (purchase: Purchase) => {
      void (async () => {
        const announce = buyingRef.current;
        try {
          const snapshot = toPurchaseSnapshot(purchase);
          if (snapshot.productId !== PRO_PRODUCT_ID) return;
          if (snapshot.purchaseState === 'pending') {
            if (announce) setNotice('pending');
            return;
          }
          const next = entitlementFromPurchase(snapshot, announce ? 'purchase' : 'restore', Date.now());
          if (!next) return;
          await saveProEntitlement(next);
          setEntitlement(next);
          try {
            await finishTransaction({ purchase, isConsumable: PRO_IS_CONSUMABLE });
          } catch {
            // The grant is saved. The store replays an unfinished transaction.
          }
          if (announce) {
            setNotice(null);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } finally {
          if (announce) {
            buyingRef.current = false;
            setBusy(null);
          }
        }
      })();
    },
    [setBusy, setEntitlement],
  );

  const onError = useCallback(
    (error: unknown) => {
      const kind = classifyStoreError(storeErrorCode(error));
      if (kind === 'cancelled') {
        buyingRef.current = false;
        setBusy(null);
        return;
      }
      if (kind === 'already-owned') {
        buyingRef.current = false;
        setBusy(null);
        void runRestoreRef.current();
        return;
      }
      buyingRef.current = false;
      setNotice(
        kind === 'pending'
          ? 'pending'
          : kind === 'unavailable'
            ? 'unavailable'
            : kind === 'missing-product'
              ? 'missing-product'
              : 'purchase-fail',
      );
      setBusy(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [setBusy],
  );

  useLayoutEffect(() => {
    onPurchaseRef.current = onPurchase;
    onErrorRef.current = onError;
    runRestoreRef.current = runRestore;
  }, [onError, onPurchase, runRestore]);

  const { connected, products, fetchProducts } = iap;
  const storePrice = priceFromProducts(products);

  useEffect(() => {
    if (!connected || !ready) return;
    let live = true;
    void (async () => {
      try {
        await fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'in-app' });
      } catch {
        // The button keeps the catalog price until the store answers.
      }
      try {
        const purchases = await getAvailablePurchases();
        if (!live) return;
        const sync = syncFromPurchases(purchases.map(toPurchaseSnapshot), Date.now());
        if (sync.status === 'revoked') {
          await saveProEntitlement(null);
          if (!live) return;
          setEntitlement(null);
          return;
        }
        if (sync.status !== 'owned') return;
        const next = reconcileEntitlement(entitlementRef.current, sync);
        await saveProEntitlement(next);
        if (!live) return;
        setEntitlement(next);
        await finishOwned(purchases);
      } catch {
        // Offline: the saved entitlement stays. An empty store list is not
        // treated as a refund: the signed-in account may not be the buyer.
      }
    })();
    return () => {
      live = false;
    };
  }, [connected, entitlementRef, fetchProducts, finishOwned, ready, setEntitlement]);

  const buy = useCallback(async () => {
    if (busyRef.current) return;
    setBusy('buy');
    setNotice(null);
    buyingRef.current = true;
    try {
      if (!iap.connected) {
        const ok = await iap.reconnect();
        if (!ok) {
          buyingRef.current = false;
          setNotice('unavailable');
          setBusy(null);
          return;
        }
      }
      await iap.requestPurchase(proPurchaseRequest());
    } catch (error) {
      onErrorRef.current(error);
    }
  }, [iap, setBusy]);

  const restore = useCallback(async () => {
    if (busyRef.current) return 'failed';
    return runRestore();
  }, [runRestore]);

  const value = useProActions({
    available: true,
    storePrice,
    buy,
    restore,
    notice,
    setNotice,
    busy,
    entitlement,
    ready,
  });

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

function WebProProvider({ children }: { children: ReactNode }) {
  const cache = useEntitlementCache();
  const [notice, setNotice] = useState<ProNotice | null>(null);

  const reject = useCallback(async () => {
    setNotice('unavailable');
  }, []);

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    setNotice('unavailable');
    return 'failed';
  }, []);

  const value = useProActions({
    available: false,
    storePrice: null,
    buy: reject,
    restore,
    notice,
    setNotice,
    busy: null,
    entitlement: cache.entitlement,
    ready: cache.ready,
  });

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function ProProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return <NativeProProvider>{children}</NativeProProvider>;
  }
  return <WebProProvider>{children}</WebProProvider>;
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used within ProProvider');
  return ctx;
}
