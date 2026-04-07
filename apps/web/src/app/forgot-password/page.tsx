'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import ProviderOrbit from '@/components/auth/ProviderOrbit';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/utils/helpers';

type ForgotPasswordResponse = {
  success: boolean;
  data?: {
    resetUrl?: string | null;
  };
  error?: string;
};

export default function ForgotPasswordPage() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localHint = useMemo(() => (submitted && resetUrl ? t.auth.resetLinkLocalHint : null), [resetUrl, submitted, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError(t.auth.invalidEmail);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = (await response.json()) as ForgotPasswordResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || t.auth.resetRequestFailed);
      }

      setSubmitted(true);
      setResetUrl(result.data?.resetUrl || null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.auth.resetRequestFailed);
    } finally {
      setLoading(false);
    }
  }

  async function copyResetLink() {
    if (!resetUrl) {
      return;
    }

    await navigator.clipboard.writeText(resetUrl);
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
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 sm:mb-3">{t.auth.resetRequestTitle}</h2>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">{t.auth.resetRequestSidebar}</p>
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
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-text-primary">{t.auth.resetRequestTitle}</h1>
            <p className="text-text-secondary text-base">{t.auth.resetRequestSubtitle}</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-sm text-text-primary" htmlFor="email">{t.auth.email}</label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base shadow-glow hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" /> {t.auth.loading}</> : t.auth.sendResetLink}
              </button>
            </form>
          ) : (
            <div className="space-y-4 rounded-[1.6rem] border border-border bg-slate-50/80 p-6 shadow-soft">
              <div>
                <div className="text-[0.72rem] uppercase tracking-[0.2em] text-text-secondary">{t.auth.resetRequestSentLabel}</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">{t.auth.resetRequestSentTitle}</h2>
              </div>
              <p className="text-sm leading-7 text-text-secondary">{t.auth.resetRequestSentBody}</p>
              {resetUrl ? (
                <div className="rounded-[1.2rem] border border-border bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">{t.auth.resetLinkLocalLabel}</div>
                  <div className="mt-2 break-all text-sm leading-6 text-text-primary">{resetUrl}</div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <a href={resetUrl} className="btn-primary no-underline justify-center">{t.auth.openResetPage}</a>
                    <button type="button" onClick={copyResetLink} className="btn-secondary justify-center">{t.auth.copyResetLink}</button>
                  </div>
                </div>
              ) : null}
              {localHint ? <p className="text-sm text-text-secondary">{localHint}</p> : null}
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
