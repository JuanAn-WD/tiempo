import { Platform } from 'react-native';

type TagResult = { id: string } | null;

async function withNfc<T>(fn: (nfc: typeof import('react-native-nfc-manager').default) => Promise<T>): Promise<T> {
  const NfcManager = (await import('react-native-nfc-manager')).default;
  try {
    await NfcManager.start();
    return await fn(NfcManager);
  } finally {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      /* already cancelled */
    }
  }
}

export function nfcAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function readTagId(): Promise<string | null> {
  if (!nfcAvailable()) return null;

  try {
    const { NfcTech } = await import('react-native-nfc-manager');
    return await withNfc(async (NfcManager) => {
      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);
      } catch {
        await NfcManager.requestTechnology(NfcTech.NfcA);
      }
      const tag = (await NfcManager.getTag()) as TagResult;
      const id = tag?.id;
      return id ? String(id).toUpperCase() : null;
    });
  } catch {
    return null;
  }
}

export async function isNfcSupported(): Promise<boolean> {
  if (!nfcAvailable()) return false;
  try {
    const NfcManager = (await import('react-native-nfc-manager')).default;
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}
