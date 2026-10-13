import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  STORE_REVIEW_STORAGE_KEY,
  parseStoreReviewRecord,
  type StoreReviewRecord,
} from '@/lib/store-review';

let write = Promise.resolve();

export async function loadStoreReviewRecord(): Promise<StoreReviewRecord> {
  try {
    const raw = await AsyncStorage.getItem(STORE_REVIEW_STORAGE_KEY);
    return parseStoreReviewRecord(raw);
  } catch {
    return parseStoreReviewRecord(null);
  }
}

export async function saveStoreReviewRecord(record: StoreReviewRecord): Promise<void> {
  const payload = JSON.stringify(record);
  const run = write.then(() => AsyncStorage.setItem(STORE_REVIEW_STORAGE_KEY, payload));
  write = run.then(
    () => undefined,
    () => undefined,
  );
  await run;
}
