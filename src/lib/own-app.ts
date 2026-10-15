import Constants from 'expo-constants';

import { packageIdsOnly } from '@/lib/android-lock';

/** Current id, plus the id shipped in app.json if config is missing at runtime. */
const FALLBACK_APP_ID = 'com.apartag.app';

export function ownAppIds(): string[] {
  const configured = [
    Constants.expoConfig?.ios?.bundleIdentifier,
    Constants.expoConfig?.android?.package,
    FALLBACK_APP_ID,
  ];
  const raw = configured.filter((id): id is string => typeof id === 'string');
  // Drop slugs and blanks. `apartag` / `tiempo` are not package names; keeping
  // them would be harmless today (exact match) and disastrous if a later
  // check ever treated them as prefixes.
  return packageIdsOnly(raw);
}
