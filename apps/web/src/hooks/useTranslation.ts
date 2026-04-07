import { useAppSelector } from '@/store/hooks';
import { getTranslations, Translations } from '@/i18n';

export function useTranslation(): Translations {
  const locale = useAppSelector((state) => state.locale.locale);
  return getTranslations(locale);
}
