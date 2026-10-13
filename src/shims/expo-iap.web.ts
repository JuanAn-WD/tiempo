import { useMemo } from 'react';

/**
 * Web stand-in for expo-iap. The store module is not on the browser, and
 * asking it for a native module throws. Purchases stay on the phone.
 */

const unavailable = () => Object.assign(new Error('Purchases are only on a device'), { code: 'iap-not-available' });

export function useIAP(_options?: {
  onPurchaseSuccess?: (purchase: unknown) => void;
  onPurchaseError?: (error: unknown) => void;
}) {
  return useMemo(
    () => ({
      connected: false,
      products: [] as { id?: string | null; displayPrice?: string | null }[],
      fetchProducts: async (_request?: unknown) => [],
      reconnect: async () => false,
      requestPurchase: async (_request?: unknown) => {
        throw unavailable();
      },
      restorePurchases: async () => {
        throw unavailable();
      },
    }),
    [],
  );
}

export async function finishTransaction(_args?: unknown): Promise<void> {
  throw unavailable();
}

export async function getAvailablePurchases(): Promise<never[]> {
  return [];
}
