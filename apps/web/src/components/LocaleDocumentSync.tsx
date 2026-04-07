'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initLocale } from '@/store/slices/localeSlice';

export default function LocaleDocumentSync() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.locale.locale);

  useEffect(() => {
    dispatch(initLocale());
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';

    document.title =
      locale === 'zh'
        ? 'MeshRouter - 统一的 AI 模型 API 平台'
        : 'MeshRouter - Unified AI Model API Platform';

    const description =
      locale === 'zh'
        ? '一个 API，访问多个 AI 模型。'
        : 'One API to access multiple AI models.';

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [locale]);

  return null;
}
