'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProviderOrbit from '@/components/auth/ProviderOrbit';
import { useTranslation } from '@/hooks/useTranslation';
import { validatePassword } from '@/utils/helpers';

type ResetPasswordResponse = {
  success: boolean;
  error?: string;
};

export default function ResetPasswordClient() {
  const t = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t.auth.invalidResetLink);
    }
  }, [token, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t.auth.invalidResetLink);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    if (!validatePassword(password)) {
      setError(t.auth.weakPassword);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const result = (await response.json()) as ResetPasswordResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || t.auth.resetPasswordFailed);
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.auth.resetPasswordFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <div className="hidden md:flex flex-col flex-1 bg-slate-100 relative overflow-hidden justify-between p-12 lg:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />

        <div className="relative z-10 flex items-center gap-3 text-2xl font-bold text-text-primary">
          <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-glow">
            <i className="fas fa-brain" />
          </div>
          <span>MeshRouter</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full mt-10">
          <ProviderOrbit />
          <div className="mt-8 sm:mt-12 text-center max-w-sm px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 sm:mb-3">{t.auth.resetPasswordTitle}</h2>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">{t.auth.resetPasswordSidebar}</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-5 text-text-secondary text-sm font-medium">
          <Link href="/privacy" className="hover:text-primary transition-colors">{t.auth.privacy}</Link>
          <span className="h-1 w-1 rounded-full bg-border" />
          <Link href="/terms" className="hover:text-primary transition-colors">{t.auth.terms}</Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2 text-xl font-bold text-text-primary">
          <i className="fas fa-brain text-primary" />
          <span>MeshRouter</span>
        </div>

        <div className="w-full max-w-[440px] animate-slide-up">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-text-primary">{t.auth.resetPasswordTitle}</h1>
            <p className="text-text-secondary text-base">{t.auth.resetPasswordSubtitle}</p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-sm text-text-primary" htmlFor="password">{t.auth.newPassword}</label>
                <input
                  id="password"
                  type="password"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  required
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-sm text-text-primary" htmlFor="confirmPassword">{t.auth.confirmPassword}</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  required
                  placeholder={t.auth.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base shadow-glow hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" /> {t.auth.loading}</> : t.auth.updatePassword}
              </button>
            </form>
          ) : (
            <div className="rounded-[1.6rem] border border-border bg-slate-50/80 p-6 shadow-soft">
              <div className="text-[0.72rem] uppercase tracking-[0.2em] text-text-secondary">{t.auth.resetPasswordDoneLabel}</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">{t.auth.resetPasswordDoneTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{t.auth.resetPasswordDoneBody}</p>
            </div>
          )}

          <div className="text-center mt-8 text-text-secondary text-sm">
            <Link href="/login" className="text-primary font-bold hover:underline">{t.auth.backToLogin}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
