'use client';

import { useMemo, useState } from 'react';
import type { User } from '@ai-gateway/shared-types';
import { useAppSelector } from '@/store/hooks';
import { copyToClipboard } from '@/utils/helpers';

interface TwoFactorCardProps {
  currentUser: User | null;
  currentTeamId?: string | null;
  onUserUpdated: (user: User) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

type SetupPayload = {
  secret: string;
  otpauthUrl: string;
};

export default function TwoFactorCard({
  currentUser,
  currentTeamId,
  onUserUpdated,
  onNotify,
}: TwoFactorCardProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';
  const tr = (zh: string, en: string) => (isZh ? zh : en);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableRecoveryCode, setDisableRecoveryCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const enabledLabel = useMemo(() => {
    if (!currentUser?.two_factor_enabled_at) {
      return null;
    }
    return new Date(currentUser.two_factor_enabled_at).toLocaleString(isZh ? 'zh-CN' : 'en-US');
  }, [currentUser?.two_factor_enabled_at, isZh]);

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/account/two-factor/setup', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || tr('初始化双因素认证失败', 'Failed to initialize 2FA'));
      }
      setSetup(result.data);
      setRecoveryCodes([]);
      onNotify(tr('请在验证器中录入密钥，然后完成校验', 'Add the secret to your authenticator and verify it.'));
    } catch (error) {
      onNotify(error instanceof Error ? error.message : tr('初始化双因素认证失败', 'Failed to initialize 2FA'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/account/two-factor/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: totpCode,
          team_id: currentTeamId || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || tr('启用双因素认证失败', 'Failed to enable 2FA'));
      }
      if (result.data.user) {
        onUserUpdated(result.data.user);
      }
      setRecoveryCodes(result.data.recoveryCodes || []);
      setSetup(null);
      setTotpCode('');
      onNotify(tr('双因素认证已启用，请妥善保存恢复码', '2FA enabled. Save the recovery codes now.'));
    } catch (error) {
      onNotify(error instanceof Error ? error.message : tr('启用双因素认证失败', 'Failed to enable 2FA'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/account/two-factor/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: disableCode || undefined,
          recoveryCode: disableRecoveryCode || undefined,
          team_id: currentTeamId || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.user) {
        throw new Error(result.error || tr('关闭双因素认证失败', 'Failed to disable 2FA'));
      }
      onUserUpdated(result.data.user);
      setDisableCode('');
      setDisableRecoveryCode('');
      setRecoveryCodes([]);
      onNotify(tr('双因素认证已关闭', '2FA disabled'));
    } catch (error) {
      onNotify(error instanceof Error ? error.message : tr('关闭双因素认证失败', 'Failed to disable 2FA'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[26px] border border-border bg-white/80 p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-success/18 text-success">
            <i className="fas fa-shield-halved text-sm" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{tr('双因素认证', 'Two-Factor Authentication')}</h3>
            <p className="mt-1 text-sm leading-7 text-text-secondary">
              {currentUser?.two_factor_enabled
                ? tr('已启用登录二次校验，可通过验证码或恢复码完成验证。', 'Sign-in verification is enabled with TOTP codes and recovery codes.')
                : tr('为账号增加第二层验证，降低凭据泄露风险。', 'Add a second verification layer to reduce credential risk.')}
            </p>
          </div>
        </div>

        {!currentUser?.two_factor_enabled ? (
          <button type="button" onClick={handleStartSetup} disabled={loading} className="btn-primary text-sm py-2.5 px-4 disabled:opacity-50">
            <i className={`fas ${loading && !setup ? 'fa-spinner fa-spin' : 'fa-shield-alt'} mr-2`} />
            {tr('开始设置', 'Start Setup')}
          </button>
        ) : (
          <span className="rounded-full bg-success/18 px-4 py-2 text-sm font-medium text-success">
            {tr('已启用', 'Enabled')}
          </span>
        )}
      </div>

      <div className="mt-5 rounded-[20px] border border-border bg-[rgba(255,248,238,0.72)] p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">
          {tr('安全状态', 'Security Status')}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="text-base font-semibold">
            {currentUser?.two_factor_enabled ? tr('双因素认证已启用', 'Two-factor authentication is enabled') : tr('双因素认证未启用', 'Two-factor authentication is disabled')}
          </div>
          {enabledLabel && <div className="text-sm text-text-secondary">{tr('启用时间：', 'Enabled at: ')}{enabledLabel}</div>}
        </div>
      </div>

      {!currentUser?.two_factor_enabled && setup && (
        <div className="mt-5 space-y-4 rounded-[24px] border border-border bg-white/72 p-4">
          <div className="rounded-[18px] border border-border bg-[rgba(169,75,43,0.06)] p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">{tr('手动录入密钥', 'Manual Secret')}</div>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="break-all rounded-[14px] bg-white/80 px-3 py-2 text-sm text-primary">{setup.secret}</code>
              <button
                type="button"
                className="btn-secondary text-sm py-2 px-4"
                onClick={() => {
                  copyToClipboard(setup.secret);
                  onNotify(tr('密钥已复制', 'Secret copied'));
                }}
              >
                <i className="fas fa-copy mr-2" />
                {tr('复制密钥', 'Copy Secret')}
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {tr('将以上密钥录入到 Google Authenticator、1Password 或其他支持 TOTP 的验证器中。', 'Add this secret to Google Authenticator, 1Password, or any TOTP-compatible authenticator.')}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">{tr('验证码', 'Verification Code')}</label>
            <input
              type="text"
              className="form-control"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              placeholder={tr('输入验证器中的 6 位验证码', 'Enter the 6-digit code from your authenticator')}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleEnable} disabled={!totpCode.trim() || loading} className="btn-primary py-2.5 px-5 disabled:opacity-50">
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-check'} mr-2`} />
              {tr('启用双因素认证', 'Enable 2FA')}
            </button>
            <button type="button" onClick={() => setSetup(null)} className="btn-secondary py-2.5 px-5">
              {tr('取消设置', 'Cancel Setup')}
            </button>
          </div>
        </div>
      )}

      {currentUser?.two_factor_enabled && (
        <div className="mt-5 space-y-4 rounded-[24px] border border-border bg-white/72 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-text-secondary">{tr('验证码', 'Authenticator Code')}</label>
              <input
                type="text"
                className="form-control"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                placeholder={tr('输入当前验证码', 'Enter the current code')}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-text-secondary">{tr('恢复码', 'Recovery Code')}</label>
              <input
                type="text"
                className="form-control"
                value={disableRecoveryCode}
                onChange={(event) => setDisableRecoveryCode(event.target.value)}
                placeholder={tr('若无法获取验证码，可使用恢复码', 'Use a recovery code if you cannot access the authenticator')}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDisable}
            disabled={(!disableCode.trim() && !disableRecoveryCode.trim()) || loading}
            className="btn-secondary border-danger/40 text-danger hover:bg-danger/10 py-2.5 px-5 disabled:opacity-50"
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-shield-virus'} mr-2`} />
            {tr('关闭双因素认证', 'Disable 2FA')}
          </button>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div className="mt-5 rounded-[24px] border border-border bg-[rgba(33,93,89,0.08)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{tr('恢复码', 'Recovery Codes')}</div>
              <p className="mt-1 text-sm leading-7 text-text-secondary">
                {tr('请立即保存以下恢复码。这些代码只会显示一次。', 'Save these recovery codes now. They are shown only once.')}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary text-sm py-2 px-4"
              onClick={() => {
                copyToClipboard(recoveryCodes.join('\n'));
                onNotify(tr('恢复码已复制', 'Recovery codes copied'));
              }}
            >
              <i className="fas fa-copy mr-2" />
              {tr('复制全部', 'Copy All')}
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {recoveryCodes.map((item) => (
              <div key={item} className="rounded-[16px] border border-border bg-white/80 px-3 py-2 font-mono text-sm text-text-primary">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
