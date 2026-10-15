/**
 * Web stand-in for react-native-nfc-manager. Importing the real package
 * throws when the native module is missing, including in the browser.
 */

export const NfcTech = {
  Ndef: 'Ndef',
  NfcA: 'NfcA',
  NfcB: 'NfcB',
  NfcF: 'NfcF',
  NfcV: 'NfcV',
  IsoDep: 'IsoDep',
  MifareClassic: 'MifareClassic',
  MifareUltralight: 'MifareUltralight',
  MifareIOS: 'mifare',
  Iso15693IOS: 'iso15693',
  FelicaIOS: 'felica',
  NdefFormatable: 'NdefFormatable',
};

export const NfcAdapter = {
  FLAG_READER_NFC_A: 0x1,
  FLAG_READER_NFC_B: 0x2,
  FLAG_READER_NFC_F: 0x4,
  FLAG_READER_NFC_V: 0x8,
  FLAG_READER_SKIP_NDEF_CHECK: 0x80,
};

const manager = {
  async start(): Promise<void> {},
  async isSupported(): Promise<boolean> {
    return false;
  },
  async isEnabled(): Promise<boolean> {
    return false;
  },
  async goToNfcSetting(): Promise<void> {},
  async cancelTechnologyRequest(_options?: { delayMsAndroid?: number }): Promise<void> {},
  async invalidateSessionIOS(): Promise<void> {},
  async unregisterTagEvent(): Promise<void> {},
  async isTagSessionAvailableIOS(): Promise<boolean> {
    return false;
  },
  async isSessionAvailableIOS(): Promise<boolean> {
    return false;
  },
  async requestTechnology(): Promise<void> {
    throw new Error('NFC is only on a device');
  },
  async getTag(): Promise<null> {
    return null;
  },
  async getLaunchTagEvent(): Promise<null> {
    return null;
  },
  async getBackgroundTag(): Promise<null> {
    return null;
  },
  async clearBackgroundTag(): Promise<void> {},
  setEventListener(): void {},
  ndefHandler: {
    async writeNdefMessage(): Promise<void> {},
    async getNdefMessage(): Promise<null> {
      return null;
    },
    async getNdefStatus(): Promise<{ status: number; capacity: number }> {
      return { status: 1, capacity: 0 };
    },
  },
  ndefFormatableHandlerAndroid: {
    async formatNdef(): Promise<void> {},
  },
};

export const NfcEvents = {
  DiscoverTag: 'NfcManagerDiscoverTag',
  DiscoverBackgroundTag: 'NfcManagerDiscoverBackgroundTag',
  SessionClosed: 'NfcManagerSessionClosed',
  StateChanged: 'NfcManagerStateChanged',
};

export const NdefStatus = {
  NotSupported: 1,
  ReadWrite: 2,
  ReadOnly: 3,
};

export const Ndef = {
  TNF_WELL_KNOWN: 0x01,
  RTD_URI: 'U',
  uriRecord(uri: string) {
    return { tnf: 0x01, type: 'U', id: [], payload: uri };
  },
  record() {
    return { tnf: 0x01, type: 'U', id: [], payload: [] as number[] };
  },
  encodeMessage(): number[] {
    return [0];
  },
};

export default manager;
