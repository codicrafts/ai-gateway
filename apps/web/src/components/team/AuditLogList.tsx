'use client';

import { useMemo, useState } from 'react';
import type { AuditAction, AuditLog } from '@ai-gateway/shared-types/team';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppSelector } from '@/store/hooks';

interface AuditLogListProps {
  logs: AuditLog[];
  onExport?: () => void;
  startDate: string | null;
  endDate: string | null;
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
  actionFilter: AuditAction | null;
  onActionFilterChange: (action: AuditAction | null) => void;
}

const PAGE_SIZE = 8;

export default function AuditLogList({
  logs,
  onExport,
  startDate,
  endDate,
  onDateRangeChange,
  actionFilter,
  onActionFilterChange,
}: AuditLogListProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';
  const text = isZh
    ? {
        title: '审计日志',
        export: '导出 CSV',
        startDate: '开始日期',
        endDate: '结束日期',
        actionType: '操作类型',
        allActions: '全部操作',
        search: '搜索操作者、目标、邮箱或 IP',
        noLogs: '暂无审计日志',
        total: '共',
        records: '条记录',
        unknownUser: '未知用户',
        unknownIp: '未知',
        prev: '上一页',
        next: '下一页',
        page: '第',
        diff: '变更详情',
        oldValue: '变更前',
        newValue: '变更后',
      }
    : {
        title: 'Audit Logs',
        export: 'Export CSV',
        startDate: 'Start Date',
        endDate: 'End Date',
        actionType: 'Action Type',
        allActions: 'All Actions',
        search: 'Search operator, target, email, or IP',
        noLogs: 'No audit logs yet',
        total: 'Total',
        records: 'records',
        unknownUser: 'Unknown User',
        unknownIp: 'Unknown',
        prev: 'Previous',
        next: 'Next',
        page: 'Page',
        diff: 'Change Details',
        oldValue: 'Before',
        newValue: 'After',
      };

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const createdAt = new Date(log.created_at);
      const startPass = !startDate || createdAt >= new Date(`${startDate}T00:00:00`);
      const endPass = !endDate || createdAt <= new Date(`${endDate}T23:59:59.999`);
      const actionPass = !actionFilter || log.action === actionFilter;
      if (!startPass || !endPass || !actionPass) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const haystack = [
        log.user?.username,
        log.ip_address,
        getTargetDescription(log, locale),
        JSON.stringify(log.old_value || {}),
        JSON.stringify(log.new_value || {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [actionFilter, endDate, locale, logs, searchQuery, startDate]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="editorial-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">{isZh ? '团队审计' : 'Team Audit'}</div>
          <h3 className="mt-3 text-xl font-semibold">{text.title}</h3>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {isZh
              ? '关键成员变更、权限调整和团队操作都会记录在这里，便于交付、复盘和权限核对。'
              : 'Key member changes, permission updates, and team actions are recorded here for delivery review and access verification.'}
          </p>
        </div>
        {onExport && (
          <button onClick={onExport} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
            <i className="fas fa-download" />
            {text.export}
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))_240px]">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">{text.startDate}</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={(event) => {
              setPage(1);
              onDateRangeChange(event.target.value || null, endDate);
            }}
            className="w-full rounded-[18px] border border-border bg-white/80 px-3 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">{text.endDate}</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={(event) => {
              setPage(1);
              onDateRangeChange(startDate, event.target.value || null);
            }}
            className="w-full rounded-[18px] border border-border bg-white/80 px-3 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">{text.actionType}</label>
          <EditorialSelect
            value={actionFilter || ''}
            onChange={(value) => {
              setPage(1);
              onActionFilterChange((value as AuditAction) || null);
            }}
            options={[
              { value: '', label: text.allActions },
              { value: 'api_key.create', label: isZh ? '创建 API Key' : 'Create API Key' },
              { value: 'api_key.update', label: isZh ? '更新 API Key' : 'Update API Key' },
              { value: 'api_key.delete', label: isZh ? '删除 API Key' : 'Delete API Key' },
              { value: 'api_key.reveal', label: isZh ? '查看完整密钥' : 'Reveal Full Key' },
              { value: 'team.create', label: isZh ? '创建团队' : 'Create Team' },
              { value: 'team.update', label: isZh ? '更新团队' : 'Update Team' },
              { value: 'team.delete', label: isZh ? '删除团队' : 'Delete Team' },
              { value: 'member.invite', label: isZh ? '邀请成员' : 'Invite Member' },
              { value: 'member.invite_accept', label: isZh ? '接受邀请' : 'Accept Invite' },
              { value: 'member.invite_decline', label: isZh ? '拒绝邀请' : 'Decline Invite' },
              { value: 'member.invite_cancel', label: isZh ? '取消邀请' : 'Cancel Invite' },
              { value: 'member.remove', label: isZh ? '移除成员' : 'Remove Member' },
              { value: 'member.role_change', label: isZh ? '角色变更' : 'Role Change' },
              { value: 'team.join_apply', label: isZh ? '申请加入团队' : 'Apply to Join Team' },
              { value: 'team.join_approve', label: isZh ? '批准加入申请' : 'Approve Join Request' },
              { value: 'team.join_reject', label: isZh ? '拒绝加入申请' : 'Reject Join Request' },
              { value: 'security.phone_bind', label: isZh ? '绑定手机号' : 'Bind Phone' },
              { value: 'security.2fa_enable', label: isZh ? '启用双因素认证' : 'Enable 2FA' },
              { value: 'security.2fa_disable', label: isZh ? '停用双因素认证' : 'Disable 2FA' },
              { value: 'ownership.transfer', label: isZh ? '转让所有权' : 'Transfer Ownership' },
            ]}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-text-secondary">{text.search}</label>
        <div className="relative">
          <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setPage(1);
              setSearchQuery(event.target.value);
            }}
            className="w-full rounded-[18px] border border-border bg-white/80 py-3 pl-11 pr-4 text-sm focus:border-primary focus:outline-none"
            placeholder={text.search}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border bg-white/45 py-10 text-center text-text-secondary">
            <i className="fas fa-clipboard-list mb-2 text-3xl opacity-50" />
            <p>{text.noLogs}</p>
          </div>
        ) : (
          paginatedLogs.map((log) => (
            <AuditLogItem
              key={log.id}
              log={log}
              locale={locale}
              text={text}
              expanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
            />
          ))
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <div>
          {text.total} {filteredLogs.length} {text.records}
        </div>
        {filteredLogs.length > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              {text.prev}
            </button>
            <span className="px-2">
              {text.page} {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              {text.next}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface AuditLogItemProps {
  log: AuditLog;
  locale: 'zh' | 'en';
  text: {
    unknownUser: string;
    unknownIp: string;
    diff: string;
    oldValue: string;
    newValue: string;
  };
  expanded: boolean;
  onToggle: () => void;
}

function AuditLogItem({ log, locale, text, expanded, onToggle }: AuditLogItemProps) {
  const actionInfo = getActionInfo(log.action, locale);
  const formattedTime = formatDateTime(log.created_at, locale);
  const hasDiff = Boolean(log.old_value || log.new_value);

  return (
    <div className="rounded-[22px] border border-border bg-white/72 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-[160px] items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${actionInfo.bgColor}`}>
              <i className={`fas ${actionInfo.icon} text-sm`} />
            </div>
            <span className={`text-sm font-medium ${actionInfo.textColor}`}>
              {actionInfo.label}
            </span>
          </div>

          <div className="flex min-w-[140px] items-center gap-2">
            <i className="fas fa-user text-xs text-text-secondary" />
            <span className="truncate text-sm">{log.user?.username || text.unknownUser}</span>
          </div>

          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm text-text-secondary">
              {getTargetDescription(log, locale)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="hidden items-center gap-1 md:inline-flex">
              <i className="fas fa-globe" />
              {log.ip_address || text.unknownIp}
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-clock" />
              {formattedTime}
            </span>
          </div>
        </div>

        {hasDiff && (
          <div className="flex justify-end">
            <button type="button" onClick={onToggle} className="text-sm font-medium text-primary hover:underline">
              {expanded ? (locale === 'zh' ? '收起变更详情' : 'Hide change details') : text.diff}
            </button>
          </div>
        )}

        {expanded && hasDiff && (
          <div className="grid gap-3 rounded-[18px] border border-border bg-[rgba(255,248,238,0.72)] p-4 lg:grid-cols-2">
            <div className="rounded-[16px] border border-border bg-white/80 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">{text.oldValue}</div>
              <pre className="mt-2 whitespace-pre-wrap break-all text-xs leading-6 text-text-primary">
                {JSON.stringify(log.old_value || {}, null, 2)}
              </pre>
            </div>
            <div className="rounded-[16px] border border-border bg-white/80 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-text-secondary">{text.newValue}</div>
              <pre className="mt-2 whitespace-pre-wrap break-all text-xs leading-6 text-text-primary">
                {JSON.stringify(log.new_value || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getActionInfo(action: AuditAction, locale: 'zh' | 'en'): {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
} {
  const zh = locale === 'zh';
  const actionMap: Record<AuditAction, { label: string; icon: string; bgColor: string; textColor: string }> = {
    'api_key.create': { label: zh ? '创建 API Key' : 'Create API Key', icon: 'fa-key', bgColor: 'bg-success/20', textColor: 'text-success' },
    'api_key.update': { label: zh ? '更新 API Key' : 'Update API Key', icon: 'fa-pen-to-square', bgColor: 'bg-primary/20', textColor: 'text-primary' },
    'api_key.delete': { label: zh ? '删除 API Key' : 'Delete API Key', icon: 'fa-trash', bgColor: 'bg-error/20', textColor: 'text-error' },
    'api_key.reveal': { label: zh ? '查看完整密钥' : 'Reveal Full Key', icon: 'fa-eye', bgColor: 'bg-warning/20', textColor: 'text-warning' },
    'team.create': { label: zh ? '创建团队' : 'Create Team', icon: 'fa-plus-circle', bgColor: 'bg-success/20', textColor: 'text-success' },
    'team.update': { label: zh ? '更新团队' : 'Update Team', icon: 'fa-edit', bgColor: 'bg-primary/20', textColor: 'text-primary' },
    'team.delete': { label: zh ? '删除团队' : 'Delete Team', icon: 'fa-trash', bgColor: 'bg-error/20', textColor: 'text-error' },
    'member.invite': { label: zh ? '邀请成员' : 'Invite Member', icon: 'fa-user-plus', bgColor: 'bg-success/20', textColor: 'text-success' },
    'member.invite_accept': { label: zh ? '接受邀请' : 'Accept Invite', icon: 'fa-user-check', bgColor: 'bg-success/20', textColor: 'text-success' },
    'member.invite_decline': { label: zh ? '拒绝邀请' : 'Decline Invite', icon: 'fa-user-xmark', bgColor: 'bg-secondary/20', textColor: 'text-secondary' },
    'member.invite_cancel': { label: zh ? '取消邀请' : 'Cancel Invite', icon: 'fa-ban', bgColor: 'bg-warning/20', textColor: 'text-warning' },
    'member.remove': { label: zh ? '移除成员' : 'Remove Member', icon: 'fa-user-minus', bgColor: 'bg-error/20', textColor: 'text-error' },
    'member.role_change': { label: zh ? '角色变更' : 'Role Change', icon: 'fa-user-cog', bgColor: 'bg-warning/20', textColor: 'text-warning' },
    'team.join_apply': { label: zh ? '申请加入团队' : 'Apply to Join Team', icon: 'fa-paper-plane', bgColor: 'bg-primary/20', textColor: 'text-primary' },
    'team.join_approve': { label: zh ? '批准加入申请' : 'Approve Join Request', icon: 'fa-user-check', bgColor: 'bg-success/20', textColor: 'text-success' },
    'team.join_reject': { label: zh ? '拒绝加入申请' : 'Reject Join Request', icon: 'fa-user-xmark', bgColor: 'bg-danger/20', textColor: 'text-danger' },
    'security.phone_bind': { label: zh ? '绑定手机号' : 'Bind Phone', icon: 'fa-mobile-screen-button', bgColor: 'bg-primary/20', textColor: 'text-primary' },
    'security.2fa_enable': { label: zh ? '启用双因素认证' : 'Enable 2FA', icon: 'fa-shield-halved', bgColor: 'bg-success/20', textColor: 'text-success' },
    'security.2fa_disable': { label: zh ? '停用双因素认证' : 'Disable 2FA', icon: 'fa-shield', bgColor: 'bg-warning/20', textColor: 'text-warning' },
    'ownership.transfer': { label: zh ? '转让所有权' : 'Transfer Ownership', icon: 'fa-exchange-alt', bgColor: 'bg-primary/20', textColor: 'text-primary' },
  };

  return actionMap[action] || {
    label: action,
    icon: 'fa-question',
    bgColor: 'bg-secondary/20',
    textColor: 'text-secondary',
  };
}

function getTargetDescription(log: AuditLog, locale: 'zh' | 'en'): string {
  const { action, target_type, new_value, old_value } = log;
  const zh = locale === 'zh';

  switch (action) {
    case 'api_key.create':
      return zh
        ? `创建了 API Key「${(new_value as { name?: string })?.name || '未命名'}」`
        : `Created API key "${(new_value as { name?: string })?.name || 'Untitled'}"`;
    case 'api_key.update':
      return zh
        ? `更新了 API Key「${(new_value as { name?: string })?.name || (old_value as { name?: string })?.name || '未命名'}」`
        : `Updated API key "${(new_value as { name?: string })?.name || (old_value as { name?: string })?.name || 'Untitled'}"`;
    case 'api_key.delete':
      return zh
        ? `删除了 API Key「${(old_value as { name?: string })?.name || '未命名'}」`
        : `Deleted API key "${(old_value as { name?: string })?.name || 'Untitled'}"`;
    case 'api_key.reveal':
      return zh
        ? `查看了 API Key「${(new_value as { name?: string })?.name || '未命名'}」的完整密钥`
        : `Viewed the full secret for API key "${(new_value as { name?: string })?.name || 'Untitled'}"`;
    case 'team.create':
      return zh ? `创建了团队 "${(new_value as { name?: string })?.name || '未知'}"` : `Created team "${(new_value as { name?: string })?.name || 'Unknown'}"`;
    case 'team.update':
      return zh ? '更新了团队资料与品牌信息' : 'Updated team profile and branding';
    case 'team.delete':
      return zh ? '删除了团队' : 'Deleted the team';
    case 'member.invite':
      return zh ? `邀请 ${(new_value as { email?: string })?.email || '用户'} 加入团队` : `Invited ${(new_value as { email?: string })?.email || 'a user'} to the team`;
    case 'member.invite_accept':
      return zh ? `接受了 ${(new_value as { email?: string })?.email || '团队邀请'}` : `Accepted the invitation for ${(new_value as { email?: string })?.email || 'the invite'}`;
    case 'member.invite_decline':
      return zh ? `拒绝了 ${(new_value as { email?: string })?.email || '团队邀请'}` : `Declined the invitation for ${(new_value as { email?: string })?.email || 'the invite'}`;
    case 'member.invite_cancel':
      return zh ? `取消了 ${(old_value as { email?: string })?.email || '团队邀请'}` : `Cancelled the invitation for ${(old_value as { email?: string })?.email || 'the invite'}`;
    case 'member.remove':
      return zh ? '移除了成员' : 'Removed a member';
    case 'member.role_change': {
      const oldRole = (old_value as { role?: string })?.role || (zh ? '未知' : 'unknown');
      const newRole = (new_value as { role?: string })?.role || (zh ? '未知' : 'unknown');
      return zh ? `将角色从 ${oldRole} 改为 ${newRole}` : `Changed role from ${oldRole} to ${newRole}`;
    }
    case 'team.join_apply':
      return zh
        ? `提交了加入团队申请${(new_value as { slug?: string })?.slug ? `（${(new_value as { slug?: string }).slug}）` : ''}`
        : `Submitted a join request${(new_value as { slug?: string })?.slug ? ` for ${(new_value as { slug?: string }).slug}` : ''}`;
    case 'team.join_approve':
      return zh ? '批准了团队加入申请' : 'Approved a team join request';
    case 'team.join_reject':
      return zh ? '拒绝了团队加入申请' : 'Rejected a team join request';
    case 'security.phone_bind':
      return zh ? '完成了手机号绑定' : 'Completed phone binding';
    case 'security.2fa_enable':
      return zh ? '启用了双因素认证' : 'Enabled two-factor authentication';
    case 'security.2fa_disable':
      return zh ? '停用了双因素认证' : 'Disabled two-factor authentication';
    case 'ownership.transfer':
      return zh ? '转让所有权给新 Owner' : 'Transferred ownership to a new Owner';
    default:
      return target_type || (zh ? '未知操作' : 'Unknown action');
  }
}

function formatDateTime(dateString: string, locale: 'zh' | 'en'): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return locale === 'zh' ? '未知时间' : 'Unknown time';
  }
}
