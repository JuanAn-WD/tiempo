/** Web stand-in. The in-app review sheet exists only on the phone. */

export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function hasAction(): Promise<boolean> {
  return false;
}

export async function requestReview(): Promise<void> {}

export function storeUrl(): null {
  return null;
}
