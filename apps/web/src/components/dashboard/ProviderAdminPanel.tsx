'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDialog } from '@/components/ui/AppDialogProvider';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { formatDate } from '@/utils/helpers';
import { CHANNEL_TYPE_OPTIONS, getChannelTypeLabel } from '@/services/admin/admin-types';
import type {
  ProviderConsoleChannelInput,
  ProviderConsoleChannelVersion,
  ProviderConsoleSnapshot,
  ProviderConsoleVendorInput,
} from '@/services/admin/provider-console-types';
import {
  PROVIDER_CHANNEL_STATUS_AUTO_DISABLED,
  PROVIDER_CHANNEL_STATUS_ENABLED,
  PROVIDER_CHANNEL_STATUS_MANUAL_DISABLED,
} from '@/services/admin/provider-console-types';

type ProviderAdminPanelProps = {
  teamId: string | null;
  tr: (zh: string, en: string) => string;
  isZh: boolean;
};

const initialVendorForm: ProviderConsoleVendorInput = {
  name: '',
  description: '',
  icon: '',
  status: 1,
};

const initialChannelForm: ProviderConsoleChannelInput = {
  name: '',
  type: 1,
  key: '',
  models: '',
  group: 'default',
  test_model: '',
  base_url: '',
  openai_organization: '',
  other: '',
  model_mapping: '',
  status_code_mapping: '',
  param_override: '',
  header_override: '',
  setting: '',
  settings: '',
  tag: '',
  priority: 0,
  weight: 0,
  remark: '',
  status: PROVIDER_CHANNEL_STATUS_ENABLED,
  auto_ban: 1,
};

export default function ProviderAdminPanel({ teamId, tr, isZh }: ProviderAdminPanelProps) {
  const dispatch = useAppDispatch();
  const { confirm: confirmDialog } = useAppDialog();
  const [snapshot, setSnapshot] = useState<ProviderConsoleSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingVendor, setSubmittingVendor] = useState(false);
  const [submittingChannel, setSubmittingChannel] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [expandedVersionChannelId, setExpandedVersionChannelId] = useState<number | null>(null);
  const [versionsLoadingChannelId, setVersionsLoadingChannelId] = useState<number | null>(null);
  const [rollbackKey, setRollbackKey] = useState<string | null>(null);
  const [versionsByChannel, setVersionsByChannel] = useState<Record<number, ProviderConsoleChannelVersion[]>>({});
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [vendorForm, setVendorForm] = useState<ProviderConsoleVendorInput>(initialVendorForm);
  const [channelForm, setChannelForm] = useState<ProviderConsoleChannelInput>(initialChannelForm);

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
      const response = await fetch(`/api/admin/provider-console?team_id=${encodeURIComponent(teamId)}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('获取供应商后台失败', 'Failed to load provider console'));
      }
      setSnapshot(result.data as ProviderConsoleSnapshot);
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('获取供应商后台失败', 'Failed to load provider console')),
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, getErrorMessage, teamId, tr]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const groupedChannels = useMemo(() => {
    const channels = snapshot?.channels || [];
    return channels.reduce<Record<string, typeof channels>>((accumulator, channel) => {
      const group = channel.group || 'default';
      if (!accumulator[group]) {
        accumulator[group] = [];
      }
      accumulator[group].push(channel);
      return accumulator;
    }, {});
  }, [snapshot?.channels]);

  const getStatusMeta = useCallback((status: number) => {
    if (status === PROVIDER_CHANNEL_STATUS_ENABLED) {
      return {
        label: tr('在线', 'Enabled'),
        tone: 'border-success/20 bg-success/10 text-success',
      };
    }
    if (status === PROVIDER_CHANNEL_STATUS_AUTO_DISABLED) {
      return {
        label: tr('自动禁用', 'Auto Disabled'),
        tone: 'border-danger/20 bg-danger/10 text-danger',
      };
    }
    return {
      label: tr('手动禁用', 'Manual Disabled'),
      tone: 'border-text-secondary/15 bg-dark-light/30 text-text-secondary',
    };
  }, [tr]);

  const runChannelAction = useCallback(async (
    channelId: number,
    action: 'status' | 'test' | 'sync',
    payload?: Record<string, unknown>
  ) => {
    if (!teamId) return;
    setActionKey(`${action}:${channelId}`);
    try {
      const route =
        action === 'status'
          ? `/api/admin/provider-console/channels/${channelId}/status`
          : action === 'test'
            ? `/api/admin/provider-console/channels/${channelId}/test`
            : `/api/admin/provider-console/channels/${channelId}/sync`;

      const response = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, ...payload }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('渠道操作失败', 'Channel action failed'));
      }

      dispatch(showNotification({
        message:
          action === 'test'
            ? tr('渠道测试已触发', 'Channel test started')
            : action === 'sync'
              ? tr('已拉取上游模型并同步能力', 'Upstream models synced')
              : tr('渠道状态已更新', 'Channel status updated'),
      }));
      await loadSnapshot();
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('渠道操作失败', 'Channel action failed')),
        type: 'error',
      }));
    } finally {
      setActionKey(null);
    }
  }, [dispatch, getErrorMessage, loadSnapshot, teamId, tr]);

  const handleToggleChannel = useCallback(async (channelId: number, status: number) => {
    const nextStatus = status === PROVIDER_CHANNEL_STATUS_ENABLED
      ? PROVIDER_CHANNEL_STATUS_MANUAL_DISABLED
      : PROVIDER_CHANNEL_STATUS_ENABLED;
    const confirmed = await confirmDialog({
      title: status === PROVIDER_CHANNEL_STATUS_ENABLED ? tr('禁用渠道', 'Disable Channel') : tr('启用渠道', 'Enable Channel'),
      message: status === PROVIDER_CHANNEL_STATUS_ENABLED
        ? tr('确认手动禁用这个渠道？', 'Disable this channel manually?')
        : tr('确认重新启用这个渠道？', 'Re-enable this channel?'),
      confirmText: status === PROVIDER_CHANNEL_STATUS_ENABLED ? tr('禁用', 'Disable') : tr('启用', 'Enable'),
      cancelText: tr('取消', 'Cancel'),
      tone: status === PROVIDER_CHANNEL_STATUS_ENABLED ? 'danger' : 'default',
    });
    if (!confirmed) return;
    await runChannelAction(channelId, 'status', { status: nextStatus });
  }, [confirmDialog, runChannelAction, tr]);

  const handleCreateVendor = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teamId) return;
    setSubmittingVendor(true);
    try {
      const response = await fetch('/api/admin/provider-console/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vendorForm, team_id: teamId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('创建供应商失败', 'Failed to create vendor'));
      }
      dispatch(showNotification({ message: tr('供应商已创建', 'Vendor created') }));
      setVendorForm(initialVendorForm);
      setShowVendorForm(false);
      await loadSnapshot();
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('创建供应商失败', 'Failed to create vendor')),
        type: 'error',
      }));
    } finally {
      setSubmittingVendor(false);
    }
  }, [dispatch, getErrorMessage, loadSnapshot, teamId, tr, vendorForm]);

  const handleCreateChannel = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teamId) return;
    setSubmittingChannel(true);
    try {
      const response = await fetch('/api/admin/provider-console/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...channelForm, team_id: teamId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('创建渠道失败', 'Failed to create channel'));
      }
      dispatch(showNotification({ message: tr('渠道已创建', 'Channel created') }));
      setChannelForm(initialChannelForm);
      setShowChannelForm(false);
      await loadSnapshot();
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('创建渠道失败', 'Failed to create channel')),
        type: 'error',
      }));
    } finally {
      setSubmittingChannel(false);
    }
  }, [channelForm, dispatch, getErrorMessage, loadSnapshot, teamId, tr]);

  const loadChannelVersions = useCallback(async (channelId: number) => {
    if (!teamId) return;
    setVersionsLoadingChannelId(channelId);
    try {
      const response = await fetch(`/api/admin/provider-console/channels/${channelId}/versions?team_id=${encodeURIComponent(teamId)}`);
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('获取版本历史失败', 'Failed to load version history'));
      }
      const nextItems = Array.isArray(result.data?.items) ? result.data.items as ProviderConsoleChannelVersion[] : [];
      setVersionsByChannel((current) => ({ ...current, [channelId]: nextItems }));
      setExpandedVersionChannelId(channelId);
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('获取版本历史失败', 'Failed to load version history')),
        type: 'error',
      }));
    } finally {
      setVersionsLoadingChannelId(null);
    }
  }, [dispatch, getErrorMessage, teamId, tr]);

  const handleToggleVersions = useCallback(async (channelId: number) => {
    if (expandedVersionChannelId === channelId) {
      setExpandedVersionChannelId(null);
      return;
    }
    if (versionsByChannel[channelId]) {
      setExpandedVersionChannelId(channelId);
      return;
    }
    await loadChannelVersions(channelId);
  }, [expandedVersionChannelId, loadChannelVersions, versionsByChannel]);

  const handleRollbackVersion = useCallback(async (channelId: number, versionId: number, summary: string) => {
    if (!teamId) return;
    const confirmed = await confirmDialog({
      title: tr('回滚渠道版本', 'Rollback Channel Version'),
      message: tr(`确认回滚到该版本？\n${summary}`, `Rollback to this version?\n${summary}`),
      confirmText: tr('回滚', 'Rollback'),
      cancelText: tr('取消', 'Cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;

    const nextRollbackKey = `${channelId}:${versionId}`;
    setRollbackKey(nextRollbackKey);
    try {
      const response = await fetch(`/api/admin/provider-console/channels/${channelId}/rollback/${versionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || tr('回滚渠道版本失败', 'Failed to rollback channel version'));
      }
      dispatch(showNotification({ message: tr('渠道已回滚到所选版本', 'Channel rolled back to selected version') }));
      await Promise.all([loadSnapshot(), loadChannelVersions(channelId)]);
      setExpandedVersionChannelId(channelId);
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('回滚渠道版本失败', 'Failed to rollback channel version')),
        type: 'error',
      }));
    } finally {
      setRollbackKey(null);
    }
  }, [confirmDialog, dispatch, getErrorMessage, loadChannelVersions, loadSnapshot, teamId, tr]);

  if (!teamId) {
    return (
      <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-6 sm:p-8 text-center text-text-secondary shadow-sm">
        {tr('请先选择一个团队，再管理供应商与渠道。', 'Select a team before managing providers and channels.')}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4 md:gap-6">
        {[
          { label: tr('供应商数', 'Vendors'), value: snapshot?.summary.vendor_count ?? 0, tone: 'text-primary bg-primary/10' },
          { label: tr('渠道数', 'Channels'), value: snapshot?.summary.channel_count ?? 0, tone: 'text-warning bg-warning/10' },
          { label: tr('在线渠道', 'Enabled'), value: snapshot?.summary.enabled_channel_count ?? 0, tone: 'text-success bg-success/10' },
          { label: tr('异常渠道', 'Unhealthy'), value: snapshot?.summary.unhealthy_channel_count ?? 0, tone: 'text-danger bg-danger/10' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-4 sm:p-5 shadow-sm">
            <div className="text-[0.62rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] text-text-secondary">{item.label}</div>
            <div className="mt-2 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <i className="fas fa-layer-group text-sm" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">{tr('供应商目录', 'Vendor Registry')}</h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-text-secondary">
              {tr('维护平台展示和模型归属所使用的供应商信息。', 'Maintain the vendor registry used for model ownership and console display.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowVendorForm((current) => !current)}
            className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm"
          >
            <i className={`fas ${showVendorForm ? 'fa-minus' : 'fa-plus'} mr-2`} />
            {showVendorForm ? tr('收起表单', 'Hide Form') : tr('新增供应商', 'Add Vendor')}
          </button>
        </div>

        {showVendorForm ? (
          <form onSubmit={handleCreateVendor} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-dark-light/10 p-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('名称', 'Name')}</span>
              <input
                value={vendorForm.name}
                onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                placeholder="OpenAI"
                required
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('图标', 'Icon')}</span>
              <input
                value={vendorForm.icon || ''}
                onChange={(event) => setVendorForm((current) => ({ ...current, icon: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                placeholder="Brain"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary sm:col-span-2">
              <span>{tr('描述', 'Description')}</span>
              <textarea
                value={vendorForm.description || ''}
                onChange={(event) => setVendorForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[92px] w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={submittingVendor} className="btn-primary rounded-full px-5 py-2 text-xs sm:text-sm disabled:opacity-70">
                <i className={`fas ${submittingVendor ? 'fa-spinner fa-spin' : 'fa-plus'} mr-2`} />
                {tr('创建供应商', 'Create Vendor')}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading && !snapshot ? (
            <div className="rounded-xl border border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary md:col-span-2 xl:col-span-3">
              {tr('正在加载供应商数据…', 'Loading vendors...')}
            </div>
          ) : (snapshot?.vendors.length || 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary md:col-span-2 xl:col-span-3">
              {tr('还没有供应商记录', 'No vendors yet')}
            </div>
          ) : (
            snapshot?.vendors.map((vendor) => (
              <div key={vendor.id} className="rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold tracking-tight text-text-primary">{vendor.name}</div>
                    <div className="mt-1 text-xs text-text-secondary">{vendor.description || tr('暂无供应商描述', 'No vendor description')}</div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                    vendor.status === 1 ? 'border-success/20 bg-success/10 text-success' : 'border-text-secondary/15 bg-dark-light/30 text-text-secondary'
                  }`}>
                    {vendor.status === 1 ? tr('启用', 'Active') : tr('停用', 'Inactive')}
                  </span>
                </div>
                <div className="mt-3 text-[0.68rem] sm:text-[0.72rem] text-text-secondary">
                  ID #{vendor.id} · {formatDate(new Date(vendor.updated_time * 1000).toISOString())}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">{tr('渠道管理', 'Channel Inventory')}</h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-text-secondary">
              {tr('这里可以创建渠道，并对现有渠道执行启停、健康检查和上游模型同步。', 'Create channels here and run enable/disable, health checks, or upstream model sync against existing channels.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowChannelForm((current) => !current)}
            className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm"
          >
            <i className={`fas ${showChannelForm ? 'fa-minus' : 'fa-plus'} mr-2`} />
            {showChannelForm ? tr('收起表单', 'Hide Form') : tr('新增渠道', 'Add Channel')}
          </button>
        </div>

        {showChannelForm ? (
          <form onSubmit={handleCreateChannel} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-dark-light/10 p-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('渠道名称', 'Channel Name')}</span>
              <input
                value={channelForm.name}
                onChange={(event) => setChannelForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                required
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('类型', 'Type')}</span>
              <select
                value={channelForm.type}
                onChange={(event) => setChannelForm((current) => ({ ...current, type: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              >
                {CHANNEL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary lg:col-span-2">
              <span>{tr('密钥', 'Key')}</span>
              <textarea
                value={channelForm.key}
                onChange={(event) => setChannelForm((current) => ({ ...current, key: event.target.value }))}
                className="min-h-[92px] w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-text-primary"
                required
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary lg:col-span-2">
              <span>{tr('模型列表', 'Models')}</span>
              <textarea
                value={channelForm.models}
                onChange={(event) => setChannelForm((current) => ({ ...current, models: event.target.value }))}
                className="min-h-[92px] w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                placeholder={isZh ? '用英文逗号分隔，例如 gpt-4o,deepseek-chat' : 'Comma-separated, for example gpt-4o,deepseek-chat'}
                required
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('分组', 'Group')}</span>
              <input
                value={channelForm.group}
                onChange={(event) => setChannelForm((current) => ({ ...current, group: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('测试模型', 'Test Model')}</span>
              <input
                value={channelForm.test_model || ''}
                onChange={(event) => setChannelForm((current) => ({ ...current, test_model: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('Base URL', 'Base URL')}</span>
              <input
                value={channelForm.base_url || ''}
                onChange={(event) => setChannelForm((current) => ({ ...current, base_url: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
              <span>{tr('备注', 'Remark')}</span>
              <input
                value={channelForm.remark || ''}
                onChange={(event) => setChannelForm((current) => ({ ...current, remark: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
              />
            </label>
            <div className="grid grid-cols-3 gap-3 lg:col-span-2">
              <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
                <span>{tr('优先级', 'Priority')}</span>
                <input
                  type="number"
                  value={channelForm.priority ?? 0}
                  onChange={(event) => setChannelForm((current) => ({ ...current, priority: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                />
              </label>
              <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
                <span>{tr('权重', 'Weight')}</span>
                <input
                  type="number"
                  value={channelForm.weight ?? 0}
                  onChange={(event) => setChannelForm((current) => ({ ...current, weight: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                />
              </label>
              <label className="space-y-1.5 text-xs sm:text-sm text-text-secondary">
                <span>{tr('自动禁用', 'Auto Ban')}</span>
                <select
                  value={channelForm.auto_ban}
                  onChange={(event) => setChannelForm((current) => ({ ...current, auto_ban: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary"
                >
                  <option value={1}>{tr('开启', 'Enabled')}</option>
                  <option value={0}>{tr('关闭', 'Disabled')}</option>
                </select>
              </label>
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <button type="submit" disabled={submittingChannel} className="btn-primary rounded-full px-5 py-2 text-xs sm:text-sm disabled:opacity-70">
                <i className={`fas ${submittingChannel ? 'fa-spinner fa-spin' : 'fa-plus'} mr-2`} />
                {tr('创建渠道', 'Create Channel')}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-5 space-y-5">
          {loading && !snapshot ? (
            <div className="rounded-xl border border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary">
              {tr('正在加载渠道数据…', 'Loading channels...')}
            </div>
          ) : Object.keys(groupedChannels).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-dark-light/10 px-4 py-10 text-center text-sm text-text-secondary">
              {tr('还没有渠道记录', 'No channels yet')}
            </div>
          ) : (
            Object.entries(groupedChannels).map(([group, channels]) => (
              <div key={group} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm sm:text-base font-bold tracking-tight text-text-primary">{group}</div>
                  <div className="text-[0.68rem] sm:text-[0.72rem] text-text-secondary">{channels.length} {tr('条渠道', 'channels')}</div>
                </div>
                <div className="space-y-3">
                  {channels.map((channel) => {
                    const statusMeta = getStatusMeta(channel.status);
                    const isTesting = actionKey === `test:${channel.id}`;
                    const isSyncing = actionKey === `sync:${channel.id}`;
                    const isToggling = actionKey === `status:${channel.id}`;
                    const isLoadingVersions = versionsLoadingChannelId === channel.id;
                    const channelVersions = versionsByChannel[channel.id] || [];
                    const showVersions = expandedVersionChannelId === channel.id;
                    return (
                      <div key={channel.id} className="rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-4 shadow-sm">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-bold tracking-tight text-text-primary">{channel.name}</span>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${statusMeta.tone}`}>
                                {statusMeta.label}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-border/60 bg-white/80 px-2.5 py-1 text-[0.62rem] font-semibold text-text-secondary">
                                {getChannelTypeLabel(channel.type)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.68rem] sm:text-[0.72rem] text-text-secondary">
                              <span>ID #{channel.id}</span>
                              <span>{tr('测试时间', 'Last Test')}: {channel.test_time ? formatDate(new Date(channel.test_time * 1000).toISOString()) : '-'}</span>
                              <span>{tr('响应', 'Latency')}: {channel.response_time ? `${channel.response_time} ms` : '-'}</span>
                              <span>{tr('余额', 'Balance')}: {Number.isFinite(channel.balance) ? channel.balance : '-'}</span>
                            </div>
                            <div className="mt-3 rounded-lg border border-border/60 bg-white/80 px-3 py-2 text-xs sm:text-sm text-text-secondary">
                              <span className="font-semibold text-text-primary">{tr('模型', 'Models')}:</span> {channel.models || tr('未配置', 'Not configured')}
                            </div>
                            {channel.remark ? (
                              <div className="mt-2 text-xs sm:text-sm text-text-secondary">{channel.remark}</div>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                            <button
                              type="button"
                              onClick={() => void runChannelAction(channel.id, 'test')}
                              disabled={isTesting}
                              className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm disabled:opacity-70"
                            >
                              <i className={`fas ${isTesting ? 'fa-spinner fa-spin' : 'fa-heart-pulse'} mr-2`} />
                              {tr('测试', 'Test')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void runChannelAction(channel.id, 'sync')}
                              disabled={isSyncing}
                              className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm disabled:opacity-70"
                            >
                              <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-2`} />
                              {tr('同步模型', 'Sync Models')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleVersions(channel.id)}
                              disabled={isLoadingVersions}
                              className="btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm disabled:opacity-70"
                            >
                              <i className={`fas ${isLoadingVersions ? 'fa-spinner fa-spin' : showVersions ? 'fa-chevron-up' : 'fa-clock-rotate-left'} mr-2`} />
                              {showVersions ? tr('收起版本', 'Hide Versions') : tr('版本历史', 'Version History')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleChannel(channel.id, channel.status)}
                              disabled={isToggling}
                              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-70 ${
                                channel.status === PROVIDER_CHANNEL_STATUS_ENABLED
                                  ? 'border border-danger/20 bg-danger/5 text-danger hover:bg-danger/10'
                                  : 'border border-success/20 bg-success/5 text-success hover:bg-success/10'
                              }`}
                            >
                              <i className={`fas ${isToggling ? 'fa-spinner fa-spin' : channel.status === PROVIDER_CHANNEL_STATUS_ENABLED ? 'fa-ban' : 'fa-check'} mr-2`} />
                              {channel.status === PROVIDER_CHANNEL_STATUS_ENABLED ? tr('禁用', 'Disable') : tr('启用', 'Enable')}
                            </button>
                          </div>
                        </div>
                        {showVersions ? (
                          <div className="mt-4 rounded-xl border border-border/60 bg-white/80 p-3 sm:p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="text-sm font-semibold text-text-primary">{tr('版本历史', 'Version History')}</div>
                              <div className="text-[0.68rem] sm:text-[0.72rem] text-text-secondary">{channelVersions.length} {tr('个版本', 'versions')}</div>
                            </div>
                            {channelVersions.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-border/60 bg-dark-light/10 px-4 py-8 text-center text-xs sm:text-sm text-text-secondary">
                                {tr('当前没有可用的版本记录', 'No version history is available yet')}
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {channelVersions.map((version) => {
                                  const isRollingBack = rollbackKey === `${channel.id}:${version.id}`;
                                  return (
                                    <div key={version.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,236,0.94))] px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-bold tracking-tight text-text-primary">v{version.version}</span>
                                          <span className="inline-flex items-center rounded-full border border-border/60 bg-white/80 px-2.5 py-1 text-[0.62rem] font-semibold text-text-secondary">
                                            {version.action}
                                          </span>
                                        </div>
                                        <div className="mt-1.5 text-xs sm:text-sm leading-6 text-text-secondary">{version.summary}</div>
                                        <div className="mt-1.5 text-[0.68rem] sm:text-[0.72rem] text-text-secondary">
                                          {formatDate(new Date(version.created_at * 1000).toISOString())}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => void handleRollbackVersion(channel.id, version.id, version.summary)}
                                        disabled={isRollingBack}
                                        className="rounded-full border border-danger/20 bg-danger/5 px-4 py-2 text-xs sm:text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-70"
                                      >
                                        <i className={`fas ${isRollingBack ? 'fa-spinner fa-spin' : 'fa-rotate-left'} mr-2`} />
                                        {tr('回滚到此版本', 'Rollback')}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
