import { Platform } from 'react-native';

import { readDeviceLocale, translate } from '@/i18n';
import { classifyNfcError } from '@/lib/nfc-errors';
import { isUnstableTagId, sameTagId, tagIdFromEvent } from '@/lib/tag-id';
import type { NfcFailure, NfcRadioStatus, NfcRead } from '@/lib/nfc-types';

type NfcManager = typeof import('react-native-nfc-manager').default;

/** How long a sheet may stay open before we close it ourselves. */
const READ_TIMEOUT_MS = 20_000;
/** Android needs a beat before reader mode is released, or the next scan sticks. */
const ANDROID_RELEASE_MS = 400;
/** iOS invalidates the system sheet asynchronously; a new session before that errors. */
const IOS_SETTLE_MS = 450;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let queue: Promise<void> = Promise.resolve();
let generation = 0;
let activeCancel: (() => void) | null = null;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function nfcAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function loadManager(): Promise<NfcManager> {
  const NfcManager = (await import('react-native-nfc-manager')).default;
  await NfcManager.start();
  return NfcManager;
}

export async function getNfcStatus(): Promise<NfcRadioStatus> {
  if (!nfcAvailable()) return { supported: false, enabled: false };
  try {
    const manager = await loadManager();
    const supported = await manager.isSupported();
    if (!supported) return { supported: false, enabled: false };
    if (Platform.OS === 'android') {
      return { supported: true, enabled: Boolean(await manager.isEnabled()) };
    }
    return { supported: true, enabled: true };
  } catch {
    return { supported: false, enabled: false };
  }
}

export async function isNfcSupported(): Promise<boolean> {
  const status = await getNfcStatus();
  return status.supported;
}

export async function openNfcSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const manager = await loadManager();
    await manager.goToNfcSetting();
    return true;
  } catch {
    return false;
  }
}

async function releaseSession(manager: NfcManager): Promise<void> {
  try {
    await manager.cancelTechnologyRequest({ delayMsAndroid: ANDROID_RELEASE_MS });
  } catch {
    /* nothing was registered */
  }
  if (Platform.OS === 'ios') {
    try {
      await manager.invalidateSessionIOS();
    } catch {
      /* already closed */
    }
    try {
      await manager.unregisterTagEvent();
    } catch {
      /* no NDEF session */
    }
    await delay(IOS_SETTLE_MS);
  }
}

async function releaseIfStuck(manager: NfcManager): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const tagStuck = Boolean(await manager.isTagSessionAvailableIOS());
    const ndefStuck = Boolean(await manager.isSessionAvailableIOS());
    if (tagStuck || ndefStuck) await releaseSession(manager);
  } catch {
    /* availability checks throw when NFC is missing */
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error('nfc-timeout'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readOnce(manager: NfcManager, myGen: number, alertMessage: string): Promise<NfcRead> {
  let timedOut = false;
  let needsRelease = false;
  let cleanupPromise: Promise<void> | null = null;
  const cleanup = () => {
    if (!needsRelease) return Promise.resolve();
    cleanupPromise ??= releaseSession(manager);
    return cleanupPromise;
  };

  const cancel = () => {
    void cleanup();
  };
  activeCancel = cancel;

  try {
    if (myGen !== generation) return { ok: false, error: 'cancelled' };

    const supported = await manager.isSupported();
    if (!supported) return { ok: false, error: 'unsupported' };

    if (Platform.OS === 'android') {
      const enabled = await manager.isEnabled();
      if (!enabled) return { ok: false, error: 'disabled' };
    }

    if (myGen !== generation) return { ok: false, error: 'cancelled' };
    await releaseIfStuck(manager);
    if (myGen !== generation) return { ok: false, error: 'cancelled' };

    const { NfcTech, NfcAdapter } = await import('react-native-nfc-manager');
    // On iOS, `Ndef` in the list accepts whatever the tag session discovers.
    // The identifier still comes from that tag session, including when an
    // NDEF-only sheet would have left `tag.id` empty.
    const techs =
      Platform.OS === 'ios'
        ? [NfcTech.Ndef, NfcTech.MifareIOS, NfcTech.Iso15693IOS, NfcTech.FelicaIOS, NfcTech.IsoDep]
        : [
            NfcTech.NfcA,
            NfcTech.NfcB,
            NfcTech.NfcF,
            NfcTech.NfcV,
            NfcTech.IsoDep,
            NfcTech.Ndef,
            NfcTech.MifareUltralight,
            NfcTech.NdefFormatable,
          ];
    const readerFlags =
      NfcAdapter.FLAG_READER_NFC_A |
      NfcAdapter.FLAG_READER_NFC_B |
      NfcAdapter.FLAG_READER_NFC_F |
      NfcAdapter.FLAG_READER_NFC_V |
      NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK;

    needsRelease = true;
    const request = manager.requestTechnology(techs, {
      alertMessage,
      invalidateAfterFirstRead: true,
      isReaderModeEnabled: true,
      readerModeFlags: readerFlags,
      readerModeDelay: 10,
    });

    await withTimeout(request, READ_TIMEOUT_MS, () => {
      timedOut = true;
      cancel();
    });

    if (myGen !== generation) return { ok: false, error: 'cancelled' };

    const tag = await manager.getTag();
    const id = tagIdFromEvent(tag);
    if (!id) return { ok: false, error: 'no-tag' };
    if (isUnstableTagId(id)) return { ok: false, error: 'unstable' };
    return { ok: true, id };
  } catch (error) {
    if (timedOut || myGen !== generation) {
      return { ok: false, error: timedOut ? 'timeout' : 'cancelled' };
    }
    return { ok: false, error: classifyNfcError(error) };
  } finally {
    await cleanup();
    if (activeCancel === cancel) activeCancel = null;
  }
}

async function readExclusive(myGen: number, alertMessage: string): Promise<NfcRead> {
  if (!nfcAvailable()) return { ok: false, error: 'unsupported' };
  if (myGen !== generation) return { ok: false, error: 'cancelled' };

  let manager: NfcManager;
  try {
    manager = await loadManager();
  } catch (error) {
    return { ok: false, error: classifyNfcError(error) };
  }

  const first = await readOnce(manager, myGen, alertMessage);
  if (first.ok || first.error !== 'session' || myGen !== generation) return first;
  await delay(IOS_SETTLE_MS);
  if (myGen !== generation) return { ok: false, error: 'cancelled' };
  return readOnce(manager, myGen, alertMessage);
}

export function cancelActiveNfcSession(): void {
  generation += 1;
  const cancel = activeCancel;
  activeCancel = null;
  cancel?.();
}

export function readTag(options?: { alertMessage?: string }): Promise<NfcRead> {
  const myGen = ++generation;
  const cancel = activeCancel;
  activeCancel = null;
  cancel?.();
  const alertMessage = options?.alertMessage ?? translate(readDeviceLocale(), 'nfc.scanPrompt');
  return enqueue(() => readExclusive(myGen, alertMessage));
}

export async function confirmTag(
  prompts: { first: string; second: string },
  onStep?: (step: 'first' | 'second') => void,
): Promise<NfcRead> {
  onStep?.('first');
  const first = await readTag({ alertMessage: prompts.first });
  if (!first.ok) return first;
  onStep?.('second');
  const second = await readTag({ alertMessage: prompts.second });
  if (!second.ok) return second;
  if (!sameTagId(first.id, second.id)) return { ok: false, error: 'mismatch' };
  return { ok: true, id: first.id };
}

export type { NfcFailure, NfcRead };
