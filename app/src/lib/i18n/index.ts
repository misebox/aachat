import { createSignal, createContext, useContext, ParentProps, createMemo } from 'solid-js';
import { translations, Language, TranslationKey } from './translations';

export { translations, type Language, type TranslationKey };

const STORAGE_KEY = 'aachat-language';

function getInitialLanguage(): Language {
  // Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (stored === 'en' || stored === 'ja')) {
    return stored;
  }

  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }

  return 'en';
}

const [language, setLanguageSignal] = createSignal<Language>(getInitialLanguage());

export function setLanguage(lang: Language): void {
  setLanguageSignal(lang);
  localStorage.setItem(STORAGE_KEY, lang);
}

export function getLanguage(): Language {
  return language();
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const lang = language();
  let text: string = translations[lang][key] || translations.en[key] || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }

  return text;
}

// Reactive translation function for use in components
export function useTranslation() {
  const translate = (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Access language() to make it reactive
    const lang = language();
    let text: string = translations[lang][key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }

    return text;
  };

  return {
    t: translate,
    language,
    setLanguage,
  };
}
