import { withoutOwnPackages } from '@/lib/self-block';

/**
 * Android application id: at least two segments, no spaces.
 * A bare slug (`apartag`, `tiempo`) or an empty string must never be treated
 * as an own-app id. A prefix or empty match would drop every selected package
 * and the session would look locked with nothing actually blocked.
 */
const PACKAGE_ID = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function packageIdsOnly(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim().toLowerCase();
    if (!PACKAGE_ID.test(id)) continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Selected packages minus this app. Never returns an empty list by stripping unrelated ids. */
export function packagesToBlock(packages: readonly string[], ownIds: readonly string[]): string[] {
  return withoutOwnPackages(packages, packageIdsOnly(ownIds));
}

export type AndroidLockDecision =
  | { ok: true; packages: string[] }
  | { ok: false; reason: 'permissions' | 'no-apps' };

/**
 * Usage access and overlay are both required before a session may count as locked.
 * Notifications are requested separately; the block still runs without them.
 */
export function androidLockDecision(input: {
  packages: readonly string[];
  ownIds: readonly string[];
  usage: boolean;
  overlay: boolean;
}): AndroidLockDecision {
  if (!input.usage || !input.overlay) return { ok: false, reason: 'permissions' };
  const packages = packagesToBlock(input.packages, input.ownIds);
  if (packages.length === 0) return { ok: false, reason: 'no-apps' };
  return { ok: true, packages };
}
