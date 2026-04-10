'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDialog } from '@/components/ui/AppDialogProvider';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { formatDate } from '@/utils/helpers';
import type { AdminChannel } from '@/services/admin/admin-types';
import type { RouterConsoleSnapshot } from '@/services/admin/router-console.service';

type RouterAdminPanelProps = {
  teamId: string | null;
  tr: (zh: string, en: string) => string;
};

type RouterPolicyForm = {
  id?: string;
  policy_name: string;
  load_balance_mode: 'priority' | 'weighted' | 'round_robin' | 'manual';
  retry_count: number;
  fallback_enabled: boolean;
  circuit_breaker_enabled: boolean;
  affinity_ttl: string;
  rate_limit_rpm: string;
  rate_limit_tpm: string;
  channel_weights: Record<string, string>;
  channel_priorities: Record<string, string>;
};

const initialPolicyForm: RouterPolicyForm = {
  policy_name: '',
  load_balance_mode: 'priority',
  retry_count: 0,
  fallback_enabled: true,
  circuit_breaker_enabled: true,
  affinity_ttl: '',
  rate_limit_rpm: '',
  rate_limit_tpm: '',
  channel_weights: {},
  channel_priorities: {},
};

function mapNumberLikeRecord(source: Record<string, unknown> | null | undefined) {
  return Object.entries(source || {}).reduce<Record<string, string>>((accumulator, [key, value]) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      accumulator[key] = String(numeric);
    }
    return accumulator;
  }, {});
}

function buildPolicyForm(policy: RouterConsoleSnapshot['policies'][number]): RouterPolicyForm {
  const rateLimit = (policy.rate_limit || {}) as Record<string, unknown>;
  return {
    id: policy.id,
    policy_name: policy.policy_name,
    load_balance_mode: policy.load_balance_mode,
    retry_count: policy.retry_count,
    fallback_enabled: policy.fallback_enabled,
    circuit_breaker_enabled: policy.circuit_breaker_enabled,
    affinity_ttl: policy.affinity_ttl === null ? '' : String(policy.affinity_ttl),
    rate_limit_rpm: rateLimit.rpm == null ? '' : String(rateLimit.rpm),
    rate_limit_tpm: rateLimit.tpm == null ? '' : String(rateLimit.tpm),
    channel_weights: mapNumberLikeRecord(policy.channel_weights),
    channel_priorities: mapNumberLikeRecord(policy.channel_priorities),
  };
}

export default function RouterAdminPanel({ teamId, tr }: RouterAdminPanelProps) {
  const dispatch = useAppDispatch();
  const { confirm: confirmDialog } = useAppDialog();
  const currentUserId = useAppSelector((state) => state.auth.currentUser?.id || null);
  const [snapshot, setSnapshot] = useState<RouterConsoleSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RouterPolicyForm>(initialPolicyForm);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    return fallback;
  }, []);

  const loadSnapshot = useCallback(async () => {
    if (!teamId) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/router-console?team_id=${encodeURIComponent(teamId)}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('获取路由策略失败', 'Failed to load routing policies'));
      }
      setSnapshot(result.data as RouterConsoleSnapshot);
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('获取路由策略失败', 'Failed to load routing policies')),
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, getErrorMessage, teamId, tr]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const channels = useMemo<AdminChannel[]>(() => snapshot?.channels || [], [snapshot?.channels]);

  const resetForm = useCallback(() => {
    setForm(initialPolicyForm);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((policy: RouterConsoleSnapshot['policies'][number]) => {
    setForm(buildPolicyForm(policy));
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teamId) return;

    const channelWeights = Object.entries(form.channel_weights).reduce<Record<string, number>>((accumulator, [key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        accumulator[key] = numeric;
      }
      return accumulator;
    }, {});
    const channelPriorities = Object.entries(form.channel_priorities).reduce<Record<string, number>>((accumulator, [key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        accumulator[key] = numeric;
      }
      return accumulator;
    }, {});

    const rateLimit: Record<string, number> = {};
    const rpm = Number(form.rate_limit_rpm);
    const tpm = Number(form.rate_limit_tpm);
    if (Number.isFinite(rpm) && rpm > 0) rateLimit.rpm = rpm;
    if (Number.isFinite(tpm) && tpm > 0) rateLimit.tpm = tpm;

    const payload = {
      team_id: teamId,
      actor_user_id: currentUserId,
      policy_name: form.policy_name,
      load_balance_mode: form.load_balance_mode,
      retry_count: form.retry_count,
      fallback_enabled: form.fallback_enabled,
      circuit_breaker_enabled: form.circuit_breaker_enabled,
      affinity_ttl: form.affinity_ttl.trim() ? Number(form.affinity_ttl) : null,
      rate_limit: rateLimit,
      channel_weights: channelWeights,
      channel_priorities: channelPriorities,
      config_payload: {},
    };

    setSubmitting(true);
    try {
      const response = await fetch(
        form.id ? `/api/admin/router-console/policies/${form.id}` : '/api/admin/router-console/policies',
        {
          method: form.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('保存路由策略失败', 'Failed to save routing policy'));
      }
      dispatch(showNotification({
        message: form.id ? tr('路由策略已更新', 'Routing policy updated') : tr('路由策略已创建', 'Routing policy created'),
      }));
      resetForm();
      await loadSnapshot();
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('保存路由策略失败', 'Failed to save routing policy')),
        type: 'error',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [currentUserId, dispatch, form, getErrorMessage, loadSnapshot, resetForm, teamId, tr]);

  const handleDelete = useCallback(async (policyId: string, policyName: string) => {
    if (!teamId) return;
    const confirmed = await confirmDialog({
      title: tr('删除路由策略', 'Delete Routing Policy'),
      message: tr(`确认删除策略 “${policyName}”？`, `Delete routing policy "${policyName}"?`),
      confirmText: tr('删除', 'Delete'),
      cancelText: tr('取消', 'Cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(policyId);
    try {
      const response = await fetch(`/api/admin/router-console/policies/${policyId}?team_id=${encodeURIComponent(teamId)}`, {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('删除路由策略失败', 'Failed to delete routing policy'));
      }
      dispatch(showNotification({ message: tr('路由策略已删除', 'Routing policy deleted') }));
      await loadSnapshot();
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('删除路由策略失败', 'Failed to delete routing policy')),
        type: 'error',
      }));
    } finally {
      setDeletingId(null);
    }
  }, [confirmDialog, dispatch, getErrorMessage, loadSnapshot, teamId, tr]);

  if (!teamId) {
    return (
      <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-6 sm:p-8 text-center text-text-secondary shadow-sm">
        {tr('请先选择一个团队，再管理路由策略。', 'Select a team before managing routing policies.')}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4 md:gap-6">
        {[
          { label: tr('策略数', 'Policies'), value: snapshot?.policies.length ?? 0, tone: 'text-primary bg-primary/10' },
          { label: tr('可用渠道', 'Channels'), value: channels.length, tone: 'text-success bg-success/10' },
          { label: tr('运行时重试', 'Runtime Retries'), value: snapshot?.runtime_settings?.retry_times ?? '--', tone: 'text-warning bg-warning/10' },
          { label: tr('亲和 TTL', 'Affinity TTL'), value: snapshot?.runtime_settings ? `${snapshot.runtime_settings.channel_affinity_ttl_seconds}s` : '--', tone: 'text-text-secondary bg-dark-light/20' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-[0.62rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] text-text-secondary">{item.label}</div>
            <div className="mt-2 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <i className="fas fa-route text-sm" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">{tr('运行时全局路由概览', 'Runtime Routing Overview')}</h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-text-secondary">
              {tr('这里展示的是 new-api 当前生效的全局路由开关，用来判断团队策略和运行时默认行为是否一致。', 'This section shows the active global routing switches from new-api so you can compare team policy intent with runtime defaults.')}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot?.runtime_settings ? [
            { label: tr('自动禁用渠道', 'Auto Disable Channels'), value: snapshot.runtime_settings.automatic_disable_channel_enabled ? tr('开启', 'Enabled') : tr('关闭', 'Disabled') },
            { label: tr('自动恢复渠道', 'Auto Enable Channels'), value: snapshot.runtime_settings.automatic_enable_channel_enabled ? tr('开启', 'Enabled') : tr('关闭', 'Disabled') },
            { label: tr('禁用阈值', 'Disable Threshold'), value: snapshot.runtime_settings.channel_disable_threshold },
            { label: tr('重试次数', 'Retry Times'), value: snapshot.runtime_settings.retry_times },
            { label: tr('渠道亲和', 'Channel Affinity'), value: snapshot.runtime_settings.channel_affinity_enabled ? tr('开启', 'Enabled') : tr('关闭', 'Disabled') },
            { label: tr('自动重试状态码', 'Retry Status Codes'), value: snapshot.runtime_settings.automatic_retry_status_codes || '-' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-4 shadow-sm">
              <div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-text-secondary">{item.label}</div>
              <div className="mt-2 text-sm sm:text-base font-semibold text-text-primary break-all">{String(item.value)}</div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary md:col-span-2 xl:col-span-3">
              {tr('当前无法读取运行时全局路由设置', 'Runtime routing settings are unavailable right now')}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">{tr('团队路由策略', 'Team Routing Policies')}</h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-text-secondary">
              {tr('在这里定义团队自己的回退、重试、负载方式，以及各渠道的优先级和权重。', 'Define team-level fallback, retries, load balancing mode, and per-channel priority or weight here.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(initialPolicyForm);
              setShowForm((current) => !current);
            }}
            className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm"
          >
            <i className={`fas ${showForm ? 'fa-minus' : 'fa-plus'} mr-2`} />
            {showForm ? tr('收起表单', 'Hide Form') : tr('新增策略', 'Add Policy')}
          </button>
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-dark-light/10 p-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('策略名称', 'Policy Name')}</span>
              <input
                value={form.policy_name}
                onChange={(event) => setForm((current) => ({ ...current, policy_name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                required
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('负载方式', 'Load Balance Mode')}</span>
              <select
                value={form.load_balance_mode}
                onChange={(event) => setForm((current) => ({ ...current, load_balance_mode: event.target.value as RouterPolicyForm['load_balance_mode'] }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              >
                <option value="priority">{tr('优先级', 'Priority')}</option>
                <option value="weighted">{tr('权重', 'Weighted')}</option>
                <option value="round_robin">{tr('轮询', 'Round Robin')}</option>
                <option value="manual">{tr('手动', 'Manual')}</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('重试次数', 'Retry Count')}</span>
              <input
                type="number"
                min={0}
                value={form.retry_count}
                onChange={(event) => setForm((current) => ({ ...current, retry_count: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('亲和 TTL（秒）', 'Affinity TTL (s)')}</span>
              <input
                type="number"
                min={0}
                value={form.affinity_ttl}
                onChange={(event) => setForm((current) => ({ ...current, affinity_ttl: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>RPM</span>
              <input
                type="number"
                min={0}
                value={form.rate_limit_rpm}
                onChange={(event) => setForm((current) => ({ ...current, rate_limit_rpm: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>TPM</span>
              <input
                type="number"
                min={0}
                value={form.rate_limit_tpm}
                onChange={(event) => setForm((current) => ({ ...current, rate_limit_tpm: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <div className="flex items-center gap-6 lg:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.fallback_enabled}
                  onChange={(event) => setForm((current) => ({ ...current, fallback_enabled: event.target.checked }))}
                />
                {tr('启用回退', 'Enable Fallback')}
              </label>
              <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.circuit_breaker_enabled}
                  onChange={(event) => setForm((current) => ({ ...current, circuit_breaker_enabled: event.target.checked }))}
                />
                {tr('启用熔断', 'Enable Circuit Breaker')}
              </label>
            </div>
            <div className="lg:col-span-2 rounded-xl border border-border/60 bg-white/70 p-4">
              <div className="mb-3 text-sm font-semibold text-text-primary">{tr('渠道优先级 / 权重', 'Per-channel Priority / Weight')}</div>
              <div className="grid grid-cols-1 gap-2">
                {channels.length === 0 ? (
                  <div className="text-xs sm:text-sm text-text-secondary">{tr('当前没有可分配的渠道', 'No channels are available for assignment')}</div>
                ) : channels.map((channel) => (
                  <div key={channel.id} className="grid grid-cols-[minmax(0,1fr)_96px_96px] items-center gap-2 rounded-lg border border-border/60 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-primary">{channel.name}</div>
                      <div className="text-[0.68rem] text-text-secondary">#{channel.id} · {channel.group || 'default'}</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={form.channel_priorities[String(channel.id)] || ''}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        channel_priorities: {
                          ...current.channel_priorities,
                          [String(channel.id)]: event.target.value,
                        },
                      }))}
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary"
                      placeholder={tr('优先级', 'Priority')}
                    />
                    <input
                      type="number"
                      min={0}
                      value={form.channel_weights[String(channel.id)] || ''}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        channel_weights: {
                          ...current.channel_weights,
                          [String(channel.id)]: event.target.value,
                        },
                      }))}
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary"
                      placeholder={tr('权重', 'Weight')}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm">
                {tr('取消', 'Cancel')}
              </button>
              <button type="submit" disabled={submitting} className="btn-primary rounded-full px-5 py-2 text-xs sm:text-sm disabled:opacity-70">
                <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`} />
                {form.id ? tr('保存策略', 'Save Policy') : tr('创建策略', 'Create Policy')}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-5 space-y-3">
          {loading && !snapshot ? (
            <div className="rounded-xl border border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary">
              {tr('正在加载路由策略…', 'Loading routing policies...')}
            </div>
          ) : (snapshot?.policies.length || 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary">
              {tr('还没有团队路由策略', 'No team routing policies yet')}
            </div>
          ) : (
            snapshot?.policies.map((policy) => {
              const priorityCount = Object.keys(policy.channel_priorities || {}).length;
              const weightCount = Object.keys(policy.channel_weights || {}).length;
              const rateLimit = policy.rate_limit as Record<string, unknown>;
              return (
                <div key={policy.id} className="rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-4 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold tracking-tight text-text-primary">{policy.policy_name}</span>
                        <span className="inline-flex items-center rounded-full border border-border/60 bg-white/80 px-2.5 py-1 text-[0.62rem] font-semibold text-text-secondary">
                          {policy.load_balance_mode}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                          policy.sync_status === 'synced'
                            ? 'border-success/20 bg-success/10 text-success'
                            : policy.sync_status === 'failed'
                              ? 'border-danger/20 bg-danger/10 text-danger'
                              : 'border-warning/20 bg-warning/10 text-warning'
                        }`}>
                          {policy.sync_status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: tr('回退', 'Fallback'), value: policy.fallback_enabled ? tr('开启', 'On') : tr('关闭', 'Off') },
                          { label: tr('重试', 'Retries'), value: policy.retry_count },
                          { label: tr('优先级条目', 'Priority Entries'), value: priorityCount },
                          { label: tr('权重条目', 'Weight Entries'), value: weightCount },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg border border-border/60 bg-white px-3 py-2">
                            <div className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-text-secondary">{item.label}</div>
                            <div className="mt-1 text-sm font-semibold text-text-primary">{String(item.value)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.68rem] sm:text-[0.72rem] text-text-secondary">
                        <span>{tr('亲和 TTL', 'Affinity TTL')}: {policy.affinity_ttl ?? '-'}</span>
                        <span>RPM: {String(rateLimit.rpm ?? '-')}</span>
                        <span>TPM: {String(rateLimit.tpm ?? '-')}</span>
                        <span>{formatDate(policy.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleEdit(policy)} className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm">
                        <i className="fas fa-pen mr-2" />
                        {tr('编辑', 'Edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(policy.id, policy.policy_name)}
                        disabled={deletingId === policy.id}
                        className="rounded-full border border-danger/20 bg-danger/5 px-4 py-2 text-xs sm:text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-70"
                      >
                        <i className={`fas ${deletingId === policy.id ? 'fa-spinner fa-spin' : 'fa-trash'} mr-2`} />
                        {tr('删除', 'Delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
