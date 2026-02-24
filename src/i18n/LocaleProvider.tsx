import { createContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import fr from './fr.json';
import en from './en.json';

type Locale = 'fr' | 'en';
type Translations = typeof fr;

interface LocaleContextValue {
  locale: Locale;
  t: Translations;
  pathPrefix: string;
  switchLocalePath: (currentPath: string) => string;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'fr',
  t: fr,
  pathPrefix: '',
  switchLocalePath: (p) => `/en${p}`,
});

const translations: Record<Locale, Translations> = { fr, en };

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const value = useMemo<LocaleContextValue>(() => {
    const isEn = pathname.startsWith('/en/') || pathname === '/en';
    const locale: Locale = isEn ? 'en' : 'fr';
    const pathPrefix = isEn ? '/en' : '';

    const switchLocalePath = (currentPath: string) => {
      if (locale === 'fr') {
        return `/en${currentPath}`;
      }
      return currentPath.replace(/^\/en/, '') || '/';
    };

    return {
      locale,
      t: translations[locale],
      pathPrefix,
      switchLocalePath,
    };
  }, [pathname]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
