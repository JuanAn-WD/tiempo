export type Locale = 'es' | 'en';

/**
 * Primary device language, with Spanish as the default and the fallback.
 * Pass the first locale's language code, then its language tag. An unsupported
 * primary language (anything other than English) stays in Spanish.
 */
export function pickLocale(codes: readonly (string | null | undefined)[]): Locale {
  for (const code of codes) {
    if (!code || !code.trim()) continue;
    const base = code.trim().toLowerCase().split(/[-_]/)[0];
    if (base === 'en') return 'en';
    return 'es';
  }
  return 'es';
}
