import { getLocales, useLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { pickLocale, type Locale } from '@/i18n/locale';
import { translate, type Translate, type TranslateParams, type TranslationKey } from '@/i18n/translate';

export type { Locale } from '@/i18n/locale';
export { pickLocale } from '@/i18n/locale';
export type { Translate, TranslateParams, TranslationKey } from '@/i18n/translate';
export { translate } from '@/i18n/translate';

const LocaleContext = createContext<Locale>('es');

export function readDeviceLocale(): Locale {
  try {
    const first = getLocales()[0];
    return pickLocale([first?.languageCode, first?.languageTag]);
  } catch {
    return 'es';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const device = useLocales();
  const first = device[0];
  const locale = pickLocale([first?.languageCode, first?.languageTag]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n(): { locale: Locale; t: Translate } {
  const locale = useContext(LocaleContext);
  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => translate(locale, key, params),
    [locale],
  );
  return useMemo(() => ({ locale, t }), [locale, t]);
}
