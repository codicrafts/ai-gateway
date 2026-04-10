'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { browserSupportsPasskey, normalizeRegistrationOptions, serializeCredential } from '@/utils/passkey';

interface PasskeyCardProps {
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

type PasskeyStatus = {
  enabled: boolean;
  last_used_at?: string | null;
};

export default function PasskeyCard({ onNotify }: PasskeyCardProps) {
  const [status, setStatus] = useState<PasskeyStatus>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const passkeySupported = useMemo(() => browserSupportsPasskey(), []);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/account/passkey', { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.error || '获取 Passkey 状态失败');
      }
      setStatus(result.data);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : '获取 Passkey 状态失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const lastUsedLabel = useMemo(() => {
    if (!status.last_used_at) {
      return null;
    }
    return new Date(status.last_used_at).toLocaleString();
  }, [status.last_used_at]);

  const handleRegister = async () => {
    if (!passkeySupported) {
      onNotify('当前设备或浏览器不支持 Passkey', 'error');
      return;
    }

    try {
      setWorking(true);
      const beginResponse = await fetch('/api/account/passkey/register/begin', { method: 'POST' });
      const beginResult = await beginResponse.json().catch(() => null);
      if (!beginResponse.ok || !beginResult?.success || !beginResult.data?.options) {
        throw new Error(beginResult?.error || '初始化 Passkey 失败');
      }

      const credential = await navigator.credentials.create(normalizeRegistrationOptions(beginResult.data.options));
      if (!credential) {
        throw new Error('浏览器没有返回可用的 Passkey 凭证');
      }

      const finishResponse = await fetch('/api/account/passkey/register/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeCredential(credential as PublicKeyCredential)),
      });
      const finishResult = await finishResponse.json().catch(() => null);
      if (!finishResponse.ok || !finishResult?.success) {
        throw new Error(finishResult?.error || '完成 Passkey 注册失败');
      }

      await loadStatus();
      onNotify('Passkey 已注册，可直接用于免密登录');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Passkey 注册失败', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    try {
      setWorking(true);
      const response = await fetch('/api/account/passkey', { method: 'DELETE' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || '解绑 Passkey 失败');
      }
      setStatus({ enabled: false, last_used_at: null });
      onNotify('Passkey 已解绑');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : '解绑 Passkey 失败', 'error');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.25rem] border border-border bg-white/80 p-3 sm:p-4 md:p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-[1.125rem] bg-secondary/15 text-secondary">
            <i className="fas fa-key text-xs sm:text-sm" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold">Passkey</h3>
            <p className="mt-0.5 sm:mt-1 text-[0.7rem] sm:text-xs md:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
              {status.enabled
                ? '已开启免密登录，可直接使用当前设备的生物识别或系统凭据登录。'
                : '用系统凭据替代密码登录，减少账号凭据暴露面。'}
            </p>
          </div>
        </div>

        {status.enabled ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={working}
            className="btn-secondary w-full justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shadow-sm sm:w-auto disabled:opacity-50"
          >
            <i className={`fas ${working ? 'fa-spinner fa-spin' : 'fa-link-slash'} mr-1.5 sm:mr-2`} />
            解绑 Passkey
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRegister}
            disabled={working || loading || !passkeySupported}
            className="btn-primary w-full justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shadow-sm sm:w-auto disabled:opacity-50"
          >
            <i className={`fas ${working ? 'fa-spinner fa-spin' : 'fa-fingerprint'} mr-1.5 sm:mr-2`} />
            注册 Passkey
          </button>
        )}
      </div>

      <div className="mt-4 sm:mt-5 rounded-lg sm:rounded-xl border border-border bg-[rgba(255,248,238,0.72)] p-3 sm:p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">安全状态</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="text-base font-semibold">
            {loading ? '正在检查 Passkey 状态…' : status.enabled ? 'Passkey 已启用' : 'Passkey 未启用'}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.enabled ? 'bg-success/18 text-success' : 'bg-dark-light/40 text-text-secondary'}`}>
            {status.enabled ? '可直接登录' : '未配置'}
          </span>
        </div>
        {lastUsedLabel ? (
          <div className="mt-2 text-xs sm:text-sm text-text-secondary">最后使用时间：{lastUsedLabel}</div>
        ) : null}
        {!passkeySupported ? (
          <div className="mt-2 text-xs sm:text-sm text-warning">当前设备或浏览器不支持 Passkey。</div>
        ) : null}
      </div>
    </div>
  );
}
