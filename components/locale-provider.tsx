'use client';

import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { type Locale, defaultLocale, locales, localeNames } from '@/i18n/config';
import LocaleSwitcher from './locale-switcher';

import enMessages from '../messages/en.json';
import hiMessages from '../messages/hi.json';
import taMessages from '../messages/ta.json';
import teMessages from '../messages/te.json';
import knMessages from '../messages/kn.json';
import mlMessages from '../messages/ml.json';
import bnMessages from '../messages/bn.json';
import mrMessages from '../messages/mr.json';
import guMessages from '../messages/gu.json';
import paMessages from '../messages/pa.json';

const allMessages: Record<Locale, Record<string, unknown>> = {
  en: enMessages as unknown as Record<string, unknown>,
  hi: hiMessages as unknown as Record<string, unknown>,
  ta: taMessages as unknown as Record<string, unknown>,
  te: teMessages as unknown as Record<string, unknown>,
  kn: knMessages as unknown as Record<string, unknown>,
  ml: mlMessages as unknown as Record<string, unknown>,
  bn: bnMessages as unknown as Record<string, unknown>,
  mr: mrMessages as unknown as Record<string, unknown>,
  gu: guMessages as unknown as Record<string, unknown>,
  pa: paMessages as unknown as Record<string, unknown>,
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  locales: readonly Locale[];
  localeNames: Record<Locale, string>;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  locales,
  localeNames,
});

export function useLocale() {
  return useContext(LocaleContext);
}

function detectBrowserLocale(): Locale {
  const browserLangs = navigator.languages
    ? [...navigator.languages]
    : navigator.language
      ? [navigator.language]
      : [];

  for (const browserLang of browserLangs) {
    const exact = browserLang.toLowerCase() as Locale;
    if (locales.includes(exact)) return exact;
    const prefix = browserLang.split('-')[0].toLowerCase() as Locale;
    if (locales.includes(prefix)) return prefix;
  }
  return defaultLocale;
}

export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  useEffect(() => {
    const detected = detectBrowserLocale();
    if (detected !== defaultLocale) {
      setLocaleState(detected);
      document.documentElement.lang = detected;
    }
  }, []);

  const messages = allMessages[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, locales, localeNames }}>
      <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999 }}>
          <LocaleSwitcher />
        </div>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
