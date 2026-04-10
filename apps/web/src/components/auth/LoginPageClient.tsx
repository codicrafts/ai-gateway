'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { isPhoneIdentifier, validateEmail } from '@/utils/helpers';
import type { AuthAudience } from '@/lib/auth-region';
import ProviderOrbit from '@/components/auth/ProviderOrbit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';

type LoginStep = 'account' | 'method' | 'verify';
type AuthMethod = 'code' | 'password';
type AuthProfile = {
  identifierType: 'phone' | 'email';
  accountExists: boolean;
  hasPassword: boolean;
  availableMethods: AuthMethod[];
  recommendedMethod: AuthMethod;
  requiresTwoFactor?: boolean;
  recoveryCodesRemaining?: number;
};

export default function LoginPageClient({
  authAudience,
}: {
  authAudience: AuthAudience;
}) {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.auth);
  const t = useTranslation();
  const searchParams = useSearchParams();
  const [loginStep, setLoginStep] = useState<LoginStep>('account');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('code');
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const isDomestic = authAudience === 'domestic';
  const isCodeLogin = authMethod === 'code';
  const isPasswordLogin = authMethod === 'password';
  const requiresTwoFactor = Boolean(authProfile?.requiresTwoFactor && isPasswordLogin);

  useEffect(() => {
    if (currentUser?.id) {
      window.location.href = callbackUrl;
    }
  }, [callbackUrl, currentUser?.id]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const subtitle = isDomestic ? t.auth.domesticLoginSubtitle : t.auth.globalLoginSubtitle;
  const accountPlaceholder = isDomestic ? t.auth.accountPlaceholder : t.auth.emailPlaceholder;

  const oauthProviders = useMemo(
    () => [
      { key: 'google' as const, icon: 'fab fa-google text-red-500', label: t.auth.loginWithGoogle },
      { key: 'github' as const, icon: 'fab fa-github', label: t.auth.loginWithGithub },
    ],
    [t.auth.loginWithGithub, t.auth.loginWithGoogle],
  );

  const resetFlow = () => {
    setLoginStep('account');
    setAuthMethod('code');
    setAuthProfile(null);
    setVerificationCode('');
    setPassword('');
    setShowPassword(false);
    setTotp('');
    setRecoveryCode('');
    setRememberMe(false);
    setCountdown(0);
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    try {
      const result = await signIn(provider, {
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        dispatch(showNotification({ message: t.auth.oauthLoginFallback, type: 'error' }));
        setOauthLoading(null);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      dispatch(showNotification({ message: t.auth.oauthLoginFallback, type: 'error' }));
      setOauthLoading(null);
    }
  };

  const validateCurrentIdentifier = (): 'phone' | 'email' | null => {
    if (!isDomestic) {
      if (validateEmail(identifier)) {
        return 'email';
      }

      dispatch(showNotification({ message: t.auth.invalidEmail, type: 'error' }));
      return null;
    }

    if (isPhoneIdentifier(identifier)) {
      return 'phone';
    }

    if (validateEmail(identifier)) {
      return 'email';
    }

    dispatch(showNotification({ message: t.auth.invalidIdentifier, type: 'error' }));
    return null;
  };

  const handleContinue = async () => {
    const identifierType = validateCurrentIdentifier();
    if (!identifierType) return;

    setLoading(true);
    try {
      const response = await fetch('/api/account/auth-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t.auth.loginFailed);
      }

      const profile = result.data as AuthProfile;
      const nextMethod = profile.recommendedMethod || 'code';
      setAuthProfile(profile);
      setAuthMethod(nextMethod);
      setVerificationCode('');
      setPassword('');
      setShowPassword(false);
      setTotp('');
      setRecoveryCode('');
      setRememberMe(false);
      setCountdown(0);
      setLoginStep('method');
    } catch (error) {
      dispatch(
        showNotification({
          message: error instanceof Error ? error.message : t.auth.loginFailed,
          type: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!validateCurrentIdentifier()) return;

    setSendingCode(true);
    try {
      const response = await fetch('/api/account/account-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t.auth.codeSendFailed);
      }

      const message = result.data?.debugCode
        ? `${t.auth.codeSent} (${t.auth.debugCodePrefix}${result.data.debugCode})`
        : t.auth.codeSent;
      dispatch(showNotification({ message, type: 'success' }));
      setCountdown(60);
    } catch (error) {
      dispatch(
        showNotification({
          message: error instanceof Error ? error.message : t.auth.codeSendFailed,
          type: 'error',
        }),
      );
    } finally {
      setSendingCode(false);
    }
  };

  const handleNextStep = () => {
    if (!authProfile) {
      return;
    }

    if (!authProfile.availableMethods.includes(authMethod)) {
      dispatch(showNotification({ message: t.auth.passwordUnavailable, type: 'error' }));
      return;
    }

    setVerificationCode('');
    setPassword('');
    setShowPassword(false);
    setTotp('');
    setRecoveryCode('');
    setRememberMe(false);
    setLoginStep('verify');
  };

  const handleCredentialLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateCurrentIdentifier()) return;

    if (isCodeLogin && !verificationCode.trim()) {
      dispatch(showNotification({ message: t.auth.codeRequired, type: 'error' }));
      return;
    }

    if (isPasswordLogin && !password) {
      dispatch(showNotification({ message: t.auth.passwordRequired, type: 'error' }));
      return;
    }

    if (requiresTwoFactor && !totp.trim() && !recoveryCode.trim()) {
      dispatch(showNotification({ message: t.auth.twoFactorCodeRequired || '请输入验证器生成的 6 位动态码或恢复码', type: 'error' }));
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        identifier,
        password: isPasswordLogin ? password : '',
        code: isCodeLogin ? verificationCode : '',
        totp: isPasswordLogin ? totp.trim() : '',
        recoveryCode: isPasswordLogin ? recoveryCode.trim() : '',
        authMethod: isCodeLogin ? 'code' : 'password',
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        dispatch(
          showNotification({
            message: isCodeLogin
              ? t.auth.codeInvalid
              : requiresTwoFactor
                ? t.auth.twoFactorCodeInvalid || '双因素验证码无效'
                : t.auth.wrongCredentials,
            type: 'error',
          }),
        );
        return;
      }

      if (rememberMe && isPasswordLogin) {
        localStorage.setItem('rememberMe', 'true');
      }

      dispatch(showNotification({ message: t.auth.loginSuccess }));
      setTimeout(() => {
        window.location.href = result?.url || callbackUrl;
      }, 800);
    } catch {
      dispatch(showNotification({ message: t.auth.loginFailed, type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <div className="absolute right-5 top-5 z-30 md:right-8 md:top-8">
        <div className="rounded-full border border-border bg-white/85 px-2 py-1 shadow-sm backdrop-blur-sm">
          <LanguageSwitcher />
        </div>
      </div>

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
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 sm:mb-3">
              {t.auth.brandTitle}
            </h2>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
              {t.auth.brandDesc}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-5 text-text-secondary text-sm font-medium">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            {t.auth.privacy}
          </Link>
          <span className="h-1 w-1 rounded-full bg-border" />
          <Link href="/terms" className="hover:text-primary transition-colors">
            {t.auth.terms}
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2 text-xl font-bold text-text-primary">
          <i className="fas fa-brain text-primary" />
          <span>MeshRouter</span>
        </div>

        <div className="w-full max-w-[420px] animate-slide-up">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 text-text-primary">{t.auth.loginTitle}</h1>
            <p className="text-text-secondary text-base">{subtitle}</p>
          </div>

          {loginStep === 'account' ? (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-sm text-text-primary" htmlFor="identifier">
                  {t.auth.account}
                </label>
                <input
                  id="identifier"
                  type="text"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  required
                  placeholder={accountPlaceholder}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base shadow-glow hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> {t.auth.loading}
                  </>
                ) : (
                  t.auth.continueAction
                )}
              </button>
              {!isDomestic && (
                <>
                  <div className="flex items-center text-center my-6 text-text-secondary text-sm">
                    <div className="flex-1 border-b border-border" />
                    <span className="px-4">{t.auth.or}</span>
                    <div className="flex-1 border-b border-border" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {oauthProviders.map((provider) => (
                      <button
                        key={provider.key}
                        onClick={() => handleOAuthLogin(provider.key)}
                        disabled={!!oauthLoading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 border border-border rounded-xl bg-white text-text-primary font-medium hover:bg-slate-50 hover:border-border transition-all shadow-sm disabled:opacity-50"
                      >
                        {oauthLoading === provider.key ? (
                          <i className="fas fa-spinner fa-spin" />
                        ) : (
                          <i className={provider.icon} />
                        )}
                        <span>{provider.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : loginStep === 'method' ? (
            <div className="space-y-5">
              <div className="rounded-[1.4rem] border border-border bg-dark-light/70 p-5">
                <div className="text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">{t.auth.account}</div>
                <div className="mt-2 text-lg font-semibold text-text-primary break-all">{identifier}</div>
                <button type="button" onClick={resetFlow} className="mt-3 text-sm font-medium text-primary hover:underline">
                  {t.auth.editAccount}
                </button>
              </div>

              <div>
                <div className="mb-2 font-medium text-sm text-text-primary">{t.auth.chooseVerificationMethod}</div>
                <p className="mb-4 text-sm leading-7 text-text-secondary">
                  {authProfile?.hasPassword ? t.auth.chooseMethodWithPassword : t.auth.chooseMethodCodeOnly}
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('code')}
                    className={`w-full rounded-[1.35rem] border p-4 text-left transition-colors ${
                      authMethod === 'code'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                        authMethod === 'code' ? 'border-primary bg-primary text-white' : 'border-border bg-white'
                      }`}>
                        {authMethod === 'code' ? <i className="fas fa-circle text-[0.45rem]" /> : null}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-text-primary">
                          <span>{t.auth.codeLogin}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.12em] text-primary">
                            {t.auth.recommended}
                          </span>
                        </div>
                        <div className="mt-1 text-sm leading-6 text-text-secondary">{t.auth.codeMethodDesc}</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => authProfile?.hasPassword && setAuthMethod('password')}
                    disabled={!authProfile?.hasPassword}
                    className={`w-full rounded-[1.35rem] border p-4 text-left transition-colors ${
                      authMethod === 'password'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-white'
                    } ${!authProfile?.hasPassword ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                        authMethod === 'password' ? 'border-primary bg-primary text-white' : 'border-border bg-white'
                      }`}>
                        {authMethod === 'password' ? <i className="fas fa-circle text-[0.45rem]" /> : null}
                      </span>
                      <div>
                        <div className="font-semibold text-text-primary">{t.auth.passwordLogin}</div>
                        <div className="mt-1 text-sm leading-6 text-text-secondary">
                          {authProfile?.hasPassword ? t.auth.passwordMethodDesc : t.auth.passwordUnavailable}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base shadow-glow hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                {t.auth.nextStep}
              </button>
            </div>
          ) : (
            <form onSubmit={handleCredentialLogin} className="space-y-5">
              <div className="rounded-[1.4rem] border border-border bg-dark-light/70 p-5">
                <div className="text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">{t.auth.account}</div>
                <div className="mt-2 text-lg font-semibold text-text-primary break-all">{identifier}</div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={resetFlow} className="text-sm font-medium text-primary hover:underline">
                    {t.auth.editAccount}
                  </button>
                  <button type="button" onClick={() => setLoginStep('method')} className="text-sm font-medium text-text-secondary hover:text-text-primary">
                    {t.auth.changeVerificationMethod}
                  </button>
                </div>
              </div>

              {isCodeLogin ? (
                <div>
                  <label className="block mb-2 font-medium text-sm text-text-primary" htmlFor="verificationCode">
                    {t.auth.verificationCode}
                  </label>
                  <div className="flex gap-3">
                    <input
                      id="verificationCode"
                      type="text"
                      inputMode="numeric"
                      className="flex-1 px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                      required
                      placeholder={t.auth.verificationCodePlaceholder}
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0}
                      className="btn-secondary min-w-[8rem] justify-center"
                    >
                      {sendingCode ? t.auth.sendingCode : countdown > 0 ? `${countdown}s` : t.auth.sendCode}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block mb-2 font-medium text-sm text-text-primary" htmlFor="password">
                      {t.auth.password}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
                        aria-label={showPassword ? t.auth.hidePassword || 'Hide password' : t.auth.showPassword || 'Show password'}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border bg-slate-50 text-primary focus:ring-primary/25 focus:ring-2 focus:ring-offset-0"
                        style={{ accentColor: 'var(--page-accent)' }}
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                      />
                      <span className="text-text-secondary group-hover:text-text-primary transition-colors">
                        {t.auth.rememberMe}
                      </span>
                    </label>
                    <Link href="/forgot-password" className="text-primary font-medium hover:underline hover:text-primary-hover transition-colors">
                      {t.auth.forgotPassword}
                    </Link>
                  </div>

                  {requiresTwoFactor ? (
                    <div className="rounded-[1.35rem] border border-border bg-dark-light/70 p-4">
                      <div className="text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">
                        {t.auth.twoFactorTitle || '双因素认证'}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {t.auth.twoFactorPrompt || '请输入验证器生成的 6 位动态码。你也可以改用恢复码完成登录。'}
                      </p>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="mb-2 block font-medium text-sm text-text-primary" htmlFor="totp">
                            {t.auth.twoFactorCodeLabel || '验证器动态码'}
                          </label>
                          <input
                            id="totp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            placeholder={t.auth.twoFactorCodePlaceholder || '输入 6 位动态码'}
                            value={totp}
                            onChange={(event) => setTotp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block font-medium text-sm text-text-primary" htmlFor="recoveryCode">
                            {t.auth.recoveryCodeLabel || '恢复码'}
                          </label>
                          <input
                            id="recoveryCode"
                            type="text"
                            autoComplete="one-time-code"
                            className="w-full px-4 py-3.5 bg-slate-50 border border-border rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            placeholder={t.auth.recoveryCodePlaceholder || '没有动态码时可输入恢复码'}
                            value={recoveryCode}
                            onChange={(event) => setRecoveryCode(event.target.value.trim())}
                          />
                          {authProfile?.recoveryCodesRemaining ? (
                            <p className="mt-2 text-xs text-text-secondary">
                              {(t.auth.recoveryCodesRemaining || '剩余恢复码') + `: ${authProfile.recoveryCodesRemaining}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base shadow-glow hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> {t.auth.loading}
                  </>
                ) : (
                  t.auth.verifyAndLogin
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
