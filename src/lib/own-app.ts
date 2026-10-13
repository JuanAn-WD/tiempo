import Constants from 'expo-constants';

/** Current id, plus the id shipped in app.json if config is missing at runtime. */
const FALLBACK_APP_ID = 'com.apartag.app';

export function ownAppIds(): string[] {
  const configured = [
    Constants.expoConfig?.ios?.bundleIdentifier,
    Constants.expoConfig?.android?.package,
    FALLBACK_APP_ID,
  ];
  const ids: string[] = [];
  for (const id of configured) {
    if (typeof id !== 'string' || !id.trim()) continue;
    if (ids.some((existing) => existing.toLowerCase() === id.toLowerCase())) continue;
    ids.push(id);
  }
  return ids;
}
