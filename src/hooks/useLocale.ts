import { useContext } from 'react';
import { LocaleContext } from '@/i18n/LocaleProvider';

export function useLocale() {
  return useContext(LocaleContext);
}
