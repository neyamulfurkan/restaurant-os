'use client';

// src/i18n/i18nContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES, type SupportedLanguage, type TranslationKeys, getTranslation } from './translations';

// ============= CONTEXT =============

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationKeys) => string;
  dir: 'ltr' | 'rtl';
  supportedLanguages: typeof LANGUAGES;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// ============= PROVIDER =============

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  // Load saved language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('restaurantOS-language');
      if (saved && saved in LANGUAGES) {
        setLanguageState(saved as SupportedLanguage);
      } else {
        // Try browser language
        const browserLang = navigator.language?.split('-')[0] as SupportedLanguage;
        if (browserLang && browserLang in LANGUAGES) {
          setLanguageState(browserLang);
        }
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Update <html> dir and lang when language changes
  useEffect(() => {
    const dir = LANGUAGES[language]?.dir || 'ltr';
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', dir);
    document.body.setAttribute('dir', dir);

    // RTL specific adjustments
    if (dir === 'rtl') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('restaurantOS-language', lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: keyof TranslationKeys): string => {
    return getTranslation(language, key);
  }, [language]);

  const dir = LANGUAGES[language]?.dir || 'ltr';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir, supportedLanguages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

// ============= HOOK =============

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return context;
}