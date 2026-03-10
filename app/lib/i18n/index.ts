import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';

const isBrowser = typeof window !== 'undefined';

const resources = {
  en: {
    translation: en,
  },
  'zh-TW': {
    translation: zhTW,
  },
  zh: {
    translation: zhTW,
  },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next);

  if (isBrowser) {
    i18n.use(LanguageDetector);
  }

  i18n.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-TW', 'zh'],
    nonExplicitSupportedLngs: true,
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bolt_language',
      caches: ['localStorage'],
    },
  });
}

export function normalizeLanguage(language?: string | null): 'en' | 'zh-TW' {
  const normalized = (language ?? '').toLowerCase();

  if (normalized.startsWith('zh')) {
    return 'zh-TW';
  }

  return 'en';
}

export default i18n;
