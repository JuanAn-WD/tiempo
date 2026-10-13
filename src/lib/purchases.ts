import type { Locale } from '@/i18n/locale';

/**
 * Apartag Pro is one non-consumable. The store is the source of the price:
 * catalog 4.99 EUR (and 4.99 USD), with the 2.99 launch price set in
 * App Store Connect and Play Console, not in this binary.
 */
export const PRO_PRODUCT_ID = 'pro_lifetime';

/** Passed to `finishTransaction`. Pro can be bought once. */
export const PRO_IS_CONSUMABLE = false;

export const PRO_STORAGE_KEY = 'apartag.pro.v1';

/** Shown only until the store returns `displayPrice`. */
export const CATALOG_PRICE_LABEL: Record<Locale, string> = {
  es: '4,99 €',
  en: '$4.99',
};

/** Copy only. The live charge is whatever the store is selling today. */
export const LAUNCH_PRICE_LABEL: Record<Locale, string> = {
  es: '2,99 €',
  en: '$2.99',
};

export type ProSource = 'purchase' | 'restore';

export type ProEntitlement = {
  active: true;
  productId: typeof PRO_PRODUCT_ID;
  source: ProSource;
  grantedAt: number;
  transactionId: string | null;
};

/**
 * The fields entitlement depends on. Store types are wider; this is the
 * slice the tests and the sync path both use.
 */
export type StorePurchaseSnapshot = {
  productId?: string | null;
  purchaseState?: string | null;
  transactionId?: string | null;
  id?: string | null;
  /** Set when the store reports a revocation time. A refund is not Pro. */
  revoked?: boolean;
};

export type StoreProductSnapshot = {
  id?: string | null;
  displayPrice?: string | null;
};

/** What a later Pro feature should do. Free features must not call this. */
export type ProGate = 'allow' | 'paywall' | 'locked';

export type StoreFailure =
  | 'cancelled'
  | 'pending'
  | 'already-owned'
  | 'unavailable'
  | 'missing-product'
  | 'failed';

const UNAVAILABLE = new Set([
  'network-error',
  'billing-unavailable',
  'iap-not-available',
  'service-disconnected',
  'connection-closed',
  'service-timeout',
  'init-connection',
  'service-error',
  'remote-error',
  'not-prepared',
  'activity-unavailable',
]);

const MISSING_PRODUCT = new Set(['sku-not-found', 'item-unavailable', 'query-product', 'empty-sku-list']);

export function proPurchaseRequest() {
  return {
    request: {
      apple: { sku: PRO_PRODUCT_ID },
      google: { skus: [PRO_PRODUCT_ID] },
    },
    type: 'in-app' as const,
  };
}

export function toPurchaseSnapshot(purchase: {
  productId?: string | null;
  purchaseState?: string | null;
  transactionId?: string | null;
  id?: string | null;
  revocationDateIOS?: number | null;
}): StorePurchaseSnapshot {
  const revoked = typeof purchase.revocationDateIOS === 'number' && purchase.revocationDateIOS > 0;
  return {
    productId: purchase.productId,
    purchaseState: purchase.purchaseState,
    transactionId: purchase.transactionId,
    id: purchase.id,
    revoked,
  };
}

export function isProPurchase(purchase: StorePurchaseSnapshot): boolean {
  if (purchase.revoked) return false;
  if (purchase.productId !== PRO_PRODUCT_ID) return false;
  return purchase.purchaseState === 'purchased';
}

export function pickProPurchase(
  purchases: readonly StorePurchaseSnapshot[],
): StorePurchaseSnapshot | null {
  return purchases.find(isProPurchase) ?? null;
}

function transactionIdOf(purchase: StorePurchaseSnapshot): string | null {
  const id = purchase.transactionId || purchase.id;
  return typeof id === 'string' && id.trim() ? id : null;
}

export function entitlementFromPurchase(
  purchase: StorePurchaseSnapshot,
  source: ProSource,
  now: number,
): ProEntitlement | null {
  if (!isProPurchase(purchase)) return null;
  return {
    active: true,
    productId: PRO_PRODUCT_ID,
    source,
    grantedAt: now,
    transactionId: transactionIdOf(purchase),
  };
}

export function isEntitled(record: unknown): record is ProEntitlement {
  if (!record || typeof record !== 'object') return false;
  const row = record as Partial<ProEntitlement>;
  return row.active === true && row.productId === PRO_PRODUCT_ID;
}

export function sanitizeEntitlement(raw: unknown): ProEntitlement | null {
  if (!isEntitled(raw)) return null;
  const row = raw as Partial<ProEntitlement>;
  const grantedAt =
    typeof row.grantedAt === 'number' && Number.isFinite(row.grantedAt) ? row.grantedAt : 0;
  const transactionId =
    typeof row.transactionId === 'string' && row.transactionId.trim() ? row.transactionId : null;
  return {
    active: true,
    productId: PRO_PRODUCT_ID,
    source: row.source === 'restore' ? 'restore' : 'purchase',
    grantedAt,
    transactionId,
  };
}

export function parseStoredEntitlement(raw: string | null | undefined): ProEntitlement | null {
  if (!raw) return null;
  try {
    return sanitizeEntitlement(JSON.parse(raw));
  } catch {
    return null;
  }
}

export type StoreSync =
  | { status: 'unavailable' }
  | { status: 'owned'; entitlement: ProEntitlement }
  | { status: 'revoked' }
  | { status: 'absent' };

/**
 * A failed store query keeps the on-device grant so Pro still works offline.
 * `owned` refreshes the grant. `revoked` clears it: the store named this
 * product and marked the purchase revoked. `absent` also clears, but only
 * for a caller that trusts the signed-in account. An empty list alone is
 * not that proof.
 */
export function reconcileEntitlement(
  cached: ProEntitlement | null,
  sync: StoreSync,
): ProEntitlement | null {
  if (sync.status === 'unavailable') return cached;
  if (sync.status === 'owned') return sync.entitlement;
  return null;
}

export function syncFromPurchases(
  purchases: readonly StorePurchaseSnapshot[],
  now: number,
): StoreSync {
  const owned = pickProPurchase(purchases);
  if (owned) {
    const entitlement = entitlementFromPurchase(owned, 'restore', now);
    if (entitlement) return { status: 'owned', entitlement };
  }
  const revoked = purchases.some((purchase) => purchase.productId === PRO_PRODUCT_ID && purchase.revoked);
  if (revoked) return { status: 'revoked' };
  return { status: 'absent' };
}

/**
 * Later Pro features call this before they run.
 * `allow` — already purchased, including during a focus session.
 * `paywall` — not purchased, and the session is open, so the Pro screen may open.
 * `locked` — not purchased, and a focus session is running. Do not open the paywall.
 */
export function gateProFeature(input: { entitled: boolean; locked: boolean }): ProGate {
  if (input.entitled) return 'allow';
  if (input.locked) return 'locked';
  return 'paywall';
}

export function priceFromProducts(products: readonly StoreProductSnapshot[]): string | null {
  const match = products.find((product) => product.id === PRO_PRODUCT_ID);
  const price = match?.displayPrice?.trim();
  return price ? price : null;
}

export function displayPrice(storePrice: string | null | undefined, locale: Locale): string {
  const live = storePrice?.trim();
  if (live) return live;
  return CATALOG_PRICE_LABEL[locale];
}

export function classifyStoreError(code: string | null | undefined): StoreFailure {
  if (!code) return 'failed';
  if (code === 'user-cancelled') return 'cancelled';
  if (code === 'already-owned' || code === 'duplicate-purchase') return 'already-owned';
  if (code === 'pending' || code === 'deferred-payment') return 'pending';
  if (UNAVAILABLE.has(code)) return 'unavailable';
  if (MISSING_PRODUCT.has(code)) return 'missing-product';
  return 'failed';
}

export function storeErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
