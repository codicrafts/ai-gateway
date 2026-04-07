'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore, type RootState } from '@/store';
import LocaleDocumentSync from './LocaleDocumentSync';
import { AppDialogProvider } from './ui/AppDialogProvider';
import type { User } from '@ai-gateway/shared-types';

export default function Providers({
  children,
  initialAuthUser,
}: {
  children: React.ReactNode;
  initialAuthUser: User | null;
}) {
  const storeRef = useRef<AppStore>();

  if (!storeRef.current) {
    const preloadedState: Partial<RootState> = {
      auth: {
        currentUser: initialAuthUser,
        isLoggedIn: Boolean(initialAuthUser),
        loading: false,
      },
    };
    storeRef.current = makeStore(preloadedState);
  }

  return (
    <Provider store={storeRef.current}>
      <AppDialogProvider>
        <LocaleDocumentSync />
        {children}
      </AppDialogProvider>
    </Provider>
  );
}
