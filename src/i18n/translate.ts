import { en } from './en';
import { es, type Translations } from './es';
import type { Locale } from './locale';

type Dict = typeof es;

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? Join<P, K> : Paths<T[K], Join<P, K>>;
}[keyof T & string];

export type TranslationKey = Paths<Dict>;

export type TranslateParams = Record<string, string | number>;

export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

const catalogs: Record<Locale, Translations> = { es, en };

function lookup(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(locale: Locale, key: TranslationKey, params?: TranslateParams): string {
  const value = lookup(catalogs[locale], key) ?? lookup(catalogs.es, key) ?? key;
  return interpolate(value, params);
}
