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
};

const SUPPORTED_CODES = new Set(Object.values(LANGUAGE_CODES));
const STORAGE_KEY = 'dreno-lang';

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

function detectInitialLang(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_CODES.has(saved)) return saved;
  } catch {}
  try {
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (SUPPORTED_CODES.has(browser)) return browser;
  } catch {}
  return 'en';
}

const initialLang = detectInitialLang();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Kick off async load of the non-English initial choice so the UI switches
// as soon as the bundle arrives (no manual reload needed).
if (initialLang !== 'en') {
  loadLocale(initialLang).then(() => i18n.changeLanguage(initialLang));
}

export function setLanguageFromPreference(preference: string) {
  const code = LANGUAGE_CODES[preference] ?? preference;
  const resolved = SUPPORTED_CODES.has(code) ? code : 'en';
  try { localStorage.setItem(STORAGE_KEY, resolved); } catch {}
  loadLocale(resolved).then(() => {
    i18n.changeLanguage(resolved);
  });
}

export default i18n;
