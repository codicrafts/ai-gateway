import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Locale, defaultLocale } from '@/i18n';

interface LocaleState {
  locale: Locale;
}

const getInitialLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale') as Locale;
    if (saved && (saved === 'zh' || saved === 'en')) {
      return saved;
    }
    // 检测浏览器语言
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  }
  return defaultLocale;
};

const initialState: LocaleState = {
  locale: defaultLocale,
};

const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLocale: (state, action: PayloadAction<Locale>) => {
      state.locale = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', action.payload);
      }
    },
    initLocale: (state) => {
      state.locale = getInitialLocale();
    },
  },
});

export const { setLocale, initLocale } = localeSlice.actions;
export default localeSlice.reducer;
