import { zh } from './locales/zh';
import { en } from './locales/en';

export type Locale = 'zh' | 'en';
export type Translations = typeof zh;

export const locales: Record<Locale, Translations> = { zh, en };

export const defaultLocale: Locale = 'zh';

export function getTranslations(locale: Locale): Translations {
  return locales[locale] || locales[defaultLocale];
}
