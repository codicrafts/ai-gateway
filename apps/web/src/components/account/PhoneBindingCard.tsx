'use client';

import { useState } from 'react';
import type { User } from '@ai-gateway/shared-types';
import { useAppSelector } from '@/store/hooks';

interface PhoneBindingCardProps {
  currentUser: User | null;
  currentTeamId?: string | null;
  onUserUpdated: (user: User) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export default function PhoneBindingCard({
  currentUser,
  currentTeamId,
  onUserUpdated,
  onNotify,
}: PhoneBindingCardProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';
  const tr = (zh: string, en: string) => (isZh ? zh : en);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [code, setCode] = useState('');
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const isBound = Boolean(currentUser?.phone && currentUser?.phone_verified_at);

  const resetFlow = () => {
    setEditing(false);
    setCode('');
    setDebugCode(null);
    setExpiresAt(null);
    setPhone(currentUser?.phone || '');
  };

  const handleRequestCode = async () => {
    try {
      setSending(true);
      const response = await fetch('/api/account/phone-binding/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('发送验证码失败', 'Failed to send verification code'));
      }
      setExpiresAt(result.data?.expiresAt || null);
      setDebugCode(result.data?.debugCode || null);
      onNotify(tr('验证码已发送，请完成验证', 'Verification code sent'));
    } catch (error) {
      onNotify(error instanceof Error ? error.message : tr('发送验证码失败', 'Failed to send verification code'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmBinding = async () => {
    try {
      setVerifying(true);
      const response = await fetch('/api/account/phone-binding/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code,
          team_id: currentTeamId || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || tr('绑定手机号失败', 'Failed to bind phone number'));
      }
      onUserUpdated(result.data);
      onNotify(tr('手机号已完成绑定', 'Phone number bound successfully'));
      resetFlow();
    } catch (error) {
      onNotify(error instanceof Error ? error.message : tr('绑定手机号失败', 'Failed to bind phone number'), 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.25rem] border border-border bg-white/80 p-3 sm:p-4 md:p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-[1.125rem] bg-warning/18 text-warning">
            <i className="fas fa-mobile-screen-button text-xs sm:text-sm" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold">{tr('手机号绑定', 'Phone Binding')}</h3>
            <p className="mt-0.5 sm:mt-1 text-[0.7rem] sm:text-xs md:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
              {isBound
                ? tr('已绑定手机号，可用于账号验证与找回。', 'A verified phone number is available for recovery and verification.')
                : tr('绑定手机号后，可用于安全验证和账号恢复。', 'Bind a phone number for account recovery and security verification.')}
            </p>
          </div>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-secondary w-full justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shadow-sm sm:w-auto"
          >
            <i className="fas fa-sim-card mr-1.5 sm:mr-2" />
            {isBound ? tr('更换手机号', 'Change Phone') : tr('开始绑定', 'Bind Phone')}
          </button>
        ) : (
          <button type="button" onClick={resetFlow} className="btn-secondary w-full justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shadow-sm sm:w-auto">
            {tr('取消', 'Cancel')}
          </button>
        )}
      </div>

      <div className="mt-4 sm:mt-5 rounded-lg sm:rounded-xl border border-border bg-[rgba(255,248,238,0.72)] p-3 sm:p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">
          {tr('当前状态', 'Current Status')}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="text-base font-semibold">
            {currentUser?.phone || tr('尚未绑定手机号', 'No phone number bound')}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${isBound ? 'bg-success/18 text-success' : 'bg-warning/18 text-warning'}`}>
            {isBound ? tr('已验证', 'Verified') : tr('未验证', 'Unverified')}
          </span>
        </div>
      </div>

      {editing && (
        <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4 rounded-lg sm:rounded-xl border border-border bg-white/72 p-3 sm:p-4">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm text-text-secondary">{tr('手机号', 'Phone Number')}</label>
              <input
                type="tel"
                className="form-control"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={tr('请输入中国大陆手机号', 'Enter a mainland China phone number')}
              />
            </div>
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={!phone.trim() || sending}
              className="btn-primary justify-center px-5 py-3 disabled:opacity-50"
            >
              <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} mr-2`} />
              {sending ? tr('发送中', 'Sending') : tr('发送验证码', 'Send Code')}
            </button>
          </div>

          {(expiresAt || debugCode) && (
            <div className="rounded-lg sm:rounded-xl border border-border bg-[rgba(169,75,43,0.06)] p-2.5 sm:p-3 text-xs sm:text-sm text-text-secondary">
              {expiresAt && (
                <div>{tr('验证码有效期至：', 'Code valid until: ')}{new Date(expiresAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</div>
              )}
              {debugCode && (
                <div className="mt-1 font-mono text-primary">
                  {tr('开发环境验证码：', 'Development code: ')}{debugCode}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm text-text-secondary">{tr('验证码', 'Verification Code')}</label>
              <input
                type="text"
                className="form-control"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={tr('输入短信验证码', 'Enter the verification code')}
              />
            </div>
            <button
              type="button"
              onClick={handleConfirmBinding}
              disabled={!phone.trim() || !code.trim() || verifying}
              className="btn-primary justify-center px-5 py-3 disabled:opacity-50"
            >
              <i className={`fas ${verifying ? 'fa-spinner fa-spin' : 'fa-check'} mr-2`} />
              {verifying ? tr('验证中', 'Verifying') : tr('确认绑定', 'Confirm Binding')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
