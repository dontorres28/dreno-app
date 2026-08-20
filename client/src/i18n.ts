import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';

export const LANGUAGE_CODES: Record<string, string> = {
  English: 'en',
  German: 'de',
  French: 'fr',
  Italian: 'it',
  Spanish: 'es',
  Portuguese: 'pt',
  Dutch: 'nl',
  Polish: 'pl',
  Swedish: 'sv',
  Norwegian: 'nb',
  Danish: 'da',
  Finnish: 'fi',
  Romanian: 'ro',
  Russian: 'ru',
  Turkish: 'tr',
  Arabic: 'ar',
  Chinese: 'zh',
  Japanese: 'ja',
  Korean: 'ko',
  Hindi: 'hi',
};

const loadedLangs = new Set<string>(['en']);

export async function loadLocale(lang: string) {
  if (loadedLangs.has(lang)) return;
  try {
    const mod = await import(`./locales/${lang}.json`);
    i18n.addResourceBundle(lang, 'translation', mod.default, true, true);
    loadedLangs.add(lang);
  } catch {
    // fall back to English
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguageFromPreference(preference: string) {
  const code = LANGUAGE_CODES[preference] ?? 'en';
  loadLocale(code).then(() => {
    i18n.changeLanguage(code);
  });
}

export default i18n;
