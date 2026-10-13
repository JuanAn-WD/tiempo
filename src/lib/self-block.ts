/**
 * Guards that keep this app reachable during a lock.
 *
 * iOS FamilyActivityPicker cannot hide the host app. Individual tokens are
 * usually opaque (no bundle id), so a direct selection of this app cannot be
 * removed. Category tokens do not list their members, and shielding one can
 * include this app, which would hide the emergency screen. Categories are
 * therefore never applied.
 */

export const OWN_APP_NAMES = ['apartag', 'tiempo'] as const;

export function normalizeId(value: string) {
  return value.trim().toLowerCase();
}

type Selectable = {
  type?: string;
  bundleIdentifier?: string;
  displayName?: string;
};

export function isOwnAppItem(item: Selectable, ownIds: readonly string[]): boolean {
  if ((item.type ?? 'app').toLowerCase() !== 'app') return false;
  const bundle = item.bundleIdentifier ? normalizeId(item.bundleIdentifier) : '';
  if (bundle && ownIds.some((id) => normalizeId(id) === bundle)) return true;
  const name = item.displayName ? normalizeId(item.displayName) : '';
  return !!name && OWN_APP_NAMES.some((own) => own === name);
}

export type GuardedSelection<T> = {
  items: T[];
  removedOwnApp: boolean;
  ignoredCategories: number;
};

export function guardIosSelection<T extends Selectable>(
  items: readonly T[],
  ownIds: readonly string[],
): GuardedSelection<T> {
  const next: T[] = [];
  let removedOwnApp = false;
  let ignoredCategories = 0;
  for (const item of items) {
    const type = (item.type ?? 'app').toLowerCase();
    if (type === 'category') {
      ignoredCategories += 1;
      continue;
    }
    if (type === 'app' && isOwnAppItem(item, ownIds)) {
      removedOwnApp = true;
      continue;
    }
    next.push(item);
  }
  return { items: next, removedOwnApp, ignoredCategories };
}

export function withoutOwnPackages(packages: readonly string[], ownIds: readonly string[]): string[] {
  const blocked = new Set(ownIds.map(normalizeId).filter(Boolean));
  return packages.filter((pkg) => !blocked.has(normalizeId(pkg)));
}
