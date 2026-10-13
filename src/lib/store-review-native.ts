import * as StoreReview from 'expo-store-review';

/**
 * Opens the system in-app review sheet.
 * Resolves false when this device cannot show one (web, TestFlight, no store).
 * A resolved request is still counted: the OS may suppress the sheet, and
 * calling again on every session is the spam the API asks us to avoid.
 */
export async function requestNativeStoreReview(): Promise<boolean> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return false;
    if (!(await StoreReview.hasAction())) return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
