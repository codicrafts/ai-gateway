'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type DialogTone = 'default' | 'danger';

type BaseDialogOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
};

type ConfirmDialogOptions = BaseDialogOptions;
type AlertDialogOptions = Omit<BaseDialogOptions, 'cancelText'>;

type DialogState =
  | ({ kind: 'confirm' } & ConfirmDialogOptions)
  | ({ kind: 'alert' } & AlertDialogOptions)
  | null;

type AppDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const resolverRef = useRef<((value?: boolean) => void) | null>(null);

  const closeDialog = useCallback((result?: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = (value) => resolve(Boolean(value));
      setDialog({
        kind: 'confirm',
        tone: 'default',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        ...options,
      });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions) => {
    if (resolverRef.current) {
      resolverRef.current();
      resolverRef.current = null;
    }

    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({
        kind: 'alert',
        tone: 'default',
        confirmText: 'OK',
        ...options,
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (dialog.kind === 'confirm') {
        closeDialog(false);
      } else {
        closeDialog();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeDialog, dialog]);

  const value = useMemo<AppDialogContextValue>(() => ({ confirm, alert }), [alert, confirm]);
  const isDanger = dialog?.tone === 'danger';

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => closeDialog(dialog.kind === 'confirm' ? false : undefined)}
        >
          <div
            className="w-full max-w-[460px] rounded-[28px] border border-border bg-dark px-6 py-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${
                  isDanger ? 'bg-danger/14 text-danger' : 'bg-primary/14 text-primary'
                }`}
              >
                <i className={`fas ${isDanger ? 'fa-triangle-exclamation' : 'fa-circle-question'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-text-primary">
                  {dialog.title || (dialog.kind === 'confirm' ? 'Confirm action' : 'Notice')}
                </h3>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{dialog.message}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {dialog.kind === 'confirm' && (
                <button
                  type="button"
                  onClick={() => closeDialog(false)}
                  className="btn-secondary justify-center px-5 py-2.5"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => closeDialog(dialog.kind === 'confirm' ? true : undefined)}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors ${
                  isDanger
                    ? 'bg-danger hover:bg-danger/90'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);

  if (!context) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }

  return context;
}
