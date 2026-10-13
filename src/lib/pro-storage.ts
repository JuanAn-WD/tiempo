import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PRO_STORAGE_KEY,
  parseStoredEntitlement,
  type ProEntitlement,
} from '@/lib/purchases';

let write = Promise.resolve();

export async function loadProEntitlement(): Promise<ProEntitlement | null> {
  try {
    const raw = await AsyncStorage.getItem(PRO_STORAGE_KEY);
    return parseStoredEntitlement(raw);
  } catch {
    return null;
  }
}

export async function saveProEntitlement(value: ProEntitlement | null): Promise<void> {
  const payload = value ? JSON.stringify(value) : null;
  write = write.then(async () => {
    if (payload) await AsyncStorage.setItem(PRO_STORAGE_KEY, payload);
    else await AsyncStorage.removeItem(PRO_STORAGE_KEY);
  });
  await write;
}
