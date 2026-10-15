import { androidLockDecision } from '@/lib/android-lock';
import { isUnstableTagId, normalizeTagId, sameTagId } from '@/lib/tag-id';

/**
 * Launcher written on the tag as the first NDEF URI record.
 * It is not a credential. The paired tag UID is the key (the phone-key HMAC
 * is a separate credential and is never written here). A link, a notification,
 * or a copied NDEF payload must not lock or unlock on its own.
 *
 * Android does not open the app. modules/nfc-tap receives the tap in a
 * no-UI activity, checks this same UID rule, and toggles AppBlockerService.
 * decideTagToggle below is the iOS path and the shared decision spec.
 *
 * iOS limits (background tag reading):
 * - Apple's documented background reader only routes universal links and a
 *   short list of system schemes, not custom ones. Current iOS builds often
 *   still open a registered custom scheme after the user taps the system
 *   notice, but that is not guaranteed.
 * - The phone must have been unlocked once after boot, the screen has to be
 *   on, and Wallet, the camera, airplane mode, or another Core NFC session
 *   suppress the scan.
 * - The system does not include the tag UID in that URL. We then ask for a
 *   short reader session and still require a UID match.
 * - iOS cannot format a tag that is not already NDEF. Read-only tags cannot
 *   be rewritten on either platform.
 */
export const TAG_LAUNCHER_URL = 'apartag://tag';

/** URI record payload: identifier code 0x00 (no abbreviation) plus the full URI. */
export function launcherUriPayload(uri: string = TAG_LAUNCHER_URL): number[] {
  const bytes = [0x00];
  for (let i = 0; i < uri.length; i += 1) bytes.push(uri.charCodeAt(i) & 0xff);
  return bytes;
}

/**
 * True only for the launcher we write. Query, userinfo, and any other host
 * are ignored as credentials: this check never returns a tag id.
 */
export function isTagLauncherUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'apartag:') return false;
  if (parsed.username || parsed.password || parsed.port) return false;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.replace(/\/+$/, '');
  if (host === 'tag' && path === '') return true;
  if (host === '' && path === '/tag') return true;
  return false;
}

export type TagToggleReason =
  | 'missing-id'
  | 'unstable'
  | 'no-paired-tag'
  | 'wrong-tag'
  | 'permissions'
  | 'no-apps'
  | 'not-ready';

export type TagToggleDecision =
  | { ok: true; action: 'lock' | 'unlock' }
  | { ok: false; reason: TagToggleReason };

export function decideTagToggle(input: {
  onboarded: boolean;
  presentedTagId: string | null;
  pairedTagIds: readonly (string | null | undefined)[];
  locked: boolean;
  platform: 'android' | 'ios';
  usage: boolean;
  overlay: boolean;
  packages: readonly string[];
  ownIds: readonly string[];
  iosItemCount: number;
}): TagToggleDecision {
  if (!input.onboarded) return { ok: false, reason: 'not-ready' };

  const paired = input.pairedTagIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (paired.length === 0) return { ok: false, reason: 'no-paired-tag' };

  if (!input.presentedTagId) return { ok: false, reason: 'missing-id' };
  if (isUnstableTagId(input.presentedTagId) || !normalizeTagId(input.presentedTagId)) {
    return { ok: false, reason: 'unstable' };
  }
  if (!paired.some((id) => sameTagId(id, input.presentedTagId as string))) {
    return { ok: false, reason: 'wrong-tag' };
  }

  if (input.locked) return { ok: true, action: 'unlock' };

  if (input.platform === 'android') {
    const decision = androidLockDecision({
      packages: input.packages,
      ownIds: input.ownIds,
      usage: input.usage,
      overlay: input.overlay,
    });
    if (!decision.ok) return { ok: false, reason: decision.reason };
    return { ok: true, action: 'lock' };
  }

  if (input.iosItemCount <= 0) return { ok: false, reason: 'no-apps' };
  return { ok: true, action: 'lock' };
}
