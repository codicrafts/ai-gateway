'use client';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setLocale } from '@/store/slices/localeSlice';
import { Locale } from '@/i18n';

export default function LanguageSwitcher() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.locale.locale);

  const toggleLocale = () => {
    const newLocale: Locale = locale === 'zh' ? 'en' : 'zh';
    dispatch(setLocale(newLocale));
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-dark-light/50 transition-colors text-sm"
      title={locale === 'zh' ? 'Switch to English' : 'Switch to Chinese'}
    >
      <i className="fas fa-globe text-xs" />
      <span className="hidden sm:inline">{locale === 'zh' ? 'EN' : 'ZH'}</span>
    </button>
  );
}
