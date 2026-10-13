import {
  CATALOG_PRICE_LABEL,
  LAUNCH_PRICE_LABEL,
  PRO_IS_CONSUMABLE,
  PRO_PRODUCT_ID,
  classifyStoreError,
  displayPrice,
  entitlementFromPurchase,
  gateProFeature,
  isProPurchase,
  parseStoredEntitlement,
  pickProPurchase,
  priceFromProducts,
  proPurchaseRequest,
  reconcileEntitlement,
  sanitizeEntitlement,
  syncFromPurchases,
  toPurchaseSnapshot,
  type ProEntitlement,
  type StorePurchaseSnapshot,
} from './purchases';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function purchased(overrides: Partial<StorePurchaseSnapshot> = {}): StorePurchaseSnapshot {
  return {
    productId: PRO_PRODUCT_ID,
    purchaseState: 'purchased',
    transactionId: 'tx-1',
    id: 'id-1',
    ...overrides,
  };
}

const NOW = 1_700_000_000_000;

export function testPurchases() {
  check(PRO_PRODUCT_ID === 'pro_lifetime', 'product id must stay pro_lifetime');
  check(PRO_IS_CONSUMABLE === false, 'Pro is a non-consumable');
  check(CATALOG_PRICE_LABEL.es === '4,99 €', 'Spanish catalog price');
  check(CATALOG_PRICE_LABEL.en === '$4.99', 'English catalog price');
  check(LAUNCH_PRICE_LABEL.es === '2,99 €', 'Spanish launch price is copy only');
  check(LAUNCH_PRICE_LABEL.en === '$2.99', 'English launch price is copy only');

  const request = proPurchaseRequest();
  check(request.type === 'in-app', 'purchase type is in-app');
  check(request.request.apple?.sku === PRO_PRODUCT_ID, 'apple sku');
  check(request.request.google?.skus[0] === PRO_PRODUCT_ID, 'google sku');
  check(request.request.google?.skus.length === 1, 'one google sku');

  const grant = entitlementFromPurchase(purchased(), 'purchase', NOW);
  check(grant?.active === true, 'a purchased pro_lifetime grants Pro');
  check(grant?.productId === PRO_PRODUCT_ID, 'grant keeps the product id');
  check(grant?.source === 'purchase', 'purchase source');
  check(grant?.grantedAt === NOW, 'grant uses the supplied clock');
  check(grant?.transactionId === 'tx-1', 'transaction id is preferred');

  const fromId = entitlementFromPurchase(purchased({ transactionId: '', id: 'id-9' }), 'restore', NOW);
  check(fromId?.transactionId === 'id-9', 'empty transaction id falls back to id');
  check(fromId?.source === 'restore', 'restore source');

  const noId = entitlementFromPurchase(purchased({ transactionId: '  ', id: '' }), 'purchase', NOW);
  check(noId?.transactionId === null, 'blank ids are stored as null');

  check(entitlementFromPurchase(purchased({ productId: 'other' }), 'purchase', NOW) === null, 'other sku');
  check(entitlementFromPurchase(purchased({ purchaseState: 'pending' }), 'purchase', NOW) === null, 'pending');
  check(entitlementFromPurchase(purchased({ purchaseState: 'unknown' }), 'purchase', NOW) === null, 'unknown');
  check(entitlementFromPurchase(purchased({ purchaseState: undefined }), 'purchase', NOW) === null, 'missing state');
  check(entitlementFromPurchase(purchased({ revoked: true }), 'purchase', NOW) === null, 'revoked');
  check(!isProPurchase({ productId: PRO_PRODUCT_ID }), 'missing state is not owned');

  const mixed: StorePurchaseSnapshot[] = [
    purchased({ productId: 'coins', transactionId: 'nope' }),
    purchased({ purchaseState: 'pending', transactionId: 'wait' }),
    purchased({ revoked: true, transactionId: 'refund' }),
    purchased({ transactionId: 'kept' }),
  ];
  check(pickProPurchase(mixed)?.transactionId === 'kept', 'pick skips pending, other skus, and refunds');
  check(pickProPurchase([]) === null, 'empty list');

  check(sanitizeEntitlement(null) === null, 'null storage');
  check(sanitizeEntitlement({ active: true, productId: 'nope' }) === null, 'wrong product in storage');
  check(sanitizeEntitlement({ active: false, productId: PRO_PRODUCT_ID }) === null, 'inactive flag');
  check(sanitizeEntitlement('pro') === null, 'string is not an entitlement');

  const dirty = sanitizeEntitlement({
    active: true,
    productId: PRO_PRODUCT_ID,
    source: 'nope',
    grantedAt: Number.NaN,
    transactionId: '',
  });
  check(dirty?.source === 'purchase', 'unknown source becomes purchase');
  check(dirty?.grantedAt === 0, 'bad clock becomes 0');
  check(dirty?.transactionId === null, 'blank stored transaction id');

  const restored = sanitizeEntitlement({
    active: true,
    productId: PRO_PRODUCT_ID,
    source: 'restore',
    grantedAt: 12,
    transactionId: 'abc',
    extra: true,
  });
  check(restored?.source === 'restore' && restored.transactionId === 'abc', 'valid restore record');
  check(!('extra' in (restored as ProEntitlement)), 'sanitizer drops unknown fields');

  const roundTrip = parseStoredEntitlement(JSON.stringify(grant));
  check(roundTrip?.transactionId === 'tx-1' && roundTrip.grantedAt === NOW, 'json round trip');
  check(parseStoredEntitlement('{') === null, 'broken json');
  check(parseStoredEntitlement(null) === null, 'empty storage');
  check(parseStoredEntitlement('null') === null, 'json null');

  const cached = grant as ProEntitlement;
  check(reconcileEntitlement(cached, { status: 'unavailable' }) === cached, 'offline keeps the cache');
  check(reconcileEntitlement(null, { status: 'unavailable' }) === null, 'offline with no cache');
  const refreshed = entitlementFromPurchase(purchased({ transactionId: 'new' }), 'restore', NOW + 5);
  check(refreshed !== null, 'refresh grant');
  check(
    reconcileEntitlement(cached, { status: 'owned', entitlement: refreshed as ProEntitlement })?.transactionId ===
      'new',
    'a store answer replaces the cache',
  );
  check(reconcileEntitlement(cached, { status: 'absent' }) === null, 'a confirmed absence clears Pro');
  check(reconcileEntitlement(null, { status: 'absent' }) === null, 'absence with no cache');

  const ownedSync = syncFromPurchases(mixed, NOW);
  check(ownedSync.status === 'owned' && ownedSync.entitlement.transactionId === 'kept', 'sync finds Pro');
  check(ownedSync.status === 'owned' && ownedSync.entitlement.source === 'restore', 'sync source is restore');
  check(syncFromPurchases([purchased({ purchaseState: 'pending' })], NOW).status === 'absent', 'pending sync is absent');
  check(
    syncFromPurchases([purchased({ revoked: true, transactionId: 'refund' })], NOW).status === 'revoked',
    'a revoked pro purchase is not an empty list',
  );
  check(
    syncFromPurchases([purchased({ revoked: true }), purchased({ transactionId: 'kept' })], NOW).status === 'owned',
    'a live purchase wins over an older revocation',
  );
  check(reconcileEntitlement(cached, { status: 'revoked' }) === null, 'revocation clears Pro');

  check(gateProFeature({ entitled: true, locked: false }) === 'allow', 'pro unlocks the feature');
  check(gateProFeature({ entitled: true, locked: true }) === 'allow', 'pro still works during a session');
  check(gateProFeature({ entitled: false, locked: false }) === 'paywall', 'free and unlocked may open Pro');
  check(gateProFeature({ entitled: false, locked: true }) === 'locked', 'a session never opens the paywall');

  check(displayPrice('2,99 €', 'es') === '2,99 €', 'store price wins');
  check(displayPrice('  $2.99  ', 'en') === '$2.99', 'store price is trimmed');
  check(displayPrice('', 'es') === CATALOG_PRICE_LABEL.es, 'blank store price uses the catalog');
  check(displayPrice(null, 'en') === CATALOG_PRICE_LABEL.en, 'missing store price uses the catalog');
  check(displayPrice(undefined, 'es') === '4,99 €', 'undefined store price uses Spanish catalog');

  check(
    priceFromProducts([
      { id: 'other', displayPrice: '1 €' },
      { id: PRO_PRODUCT_ID, displayPrice: ' 2,99 € ' },
    ]) === '2,99 €',
    'live price comes from pro_lifetime',
  );
  check(priceFromProducts([{ id: PRO_PRODUCT_ID, displayPrice: '   ' }]) === null, 'blank display price');
  check(priceFromProducts([]) === null, 'no products');

  check(classifyStoreError('user-cancelled') === 'cancelled', 'cancel is quiet');
  check(classifyStoreError('already-owned') === 'already-owned', 'already owned restores');
  check(classifyStoreError('duplicate-purchase') === 'already-owned', 'duplicate purchase restores');
  check(classifyStoreError('pending') === 'pending', 'pending does not grant');
  check(classifyStoreError('deferred-payment') === 'pending', 'ask-to-buy waits');
  check(classifyStoreError('network-error') === 'unavailable', 'network');
  check(classifyStoreError('billing-unavailable') === 'unavailable', 'billing unavailable');
  check(classifyStoreError('not-prepared') === 'unavailable', 'store not ready');
  check(classifyStoreError('sku-not-found') === 'missing-product', 'sku missing');
  check(classifyStoreError('item-unavailable') === 'missing-product', 'item unavailable');
  check(classifyStoreError(null) === 'failed', 'missing code');
  check(classifyStoreError('purchase-error') === 'failed', 'generic failure');

  const snapped = toPurchaseSnapshot({
    productId: PRO_PRODUCT_ID,
    purchaseState: 'purchased',
    transactionId: 'tx',
    revocationDateIOS: NOW,
  });
  check(snapped.revoked === true, 'a revocation time marks the purchase revoked');
  check(entitlementFromPurchase(snapped, 'purchase', NOW) === null, 'revoked snapshot does not grant');
  const live = toPurchaseSnapshot({
    productId: PRO_PRODUCT_ID,
    purchaseState: 'purchased',
    transactionId: 'tx',
    revocationDateIOS: null,
  });
  check(live.revoked === false, 'a null revocation time is still owned');
}
