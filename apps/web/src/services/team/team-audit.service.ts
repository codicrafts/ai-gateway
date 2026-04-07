import { createServerSupabaseClient } from '@/lib/supabase';
import type { AuditAction, AuditLog, AuditLogQuery } from '@ai-gateway/shared-types/team';

type AuditLogRow = {
  id: string;
  team_id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  username: string | null;
};

const VALID_AUDIT_ACTIONS: AuditAction[] = [
  'api_key.create',
  'api_key.update',
  'api_key.delete',
  'api_key.reveal',
  'team.create',
  'team.update',
  'team.delete',
  'team.join_apply',
  'team.join_approve',
  'team.join_reject',
  'member.invite',
  'member.invite_accept',
  'member.invite_decline',
  'member.invite_cancel',
  'member.remove',
  'member.role_change',
  'ownership.transfer',
  'security.phone_bind',
  'security.2fa_enable',
  'security.2fa_disable',
];

export function isValidAuditAction(action: string): action is AuditAction {
  return VALID_AUDIT_ACTIONS.includes(action as AuditAction);
}

export function isValidISODate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime());
}

export async function listTeamAuditLogs(teamId: string, query: AuditLogQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 50));
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  let dbQuery = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId);

  if (query.start_date) {
    dbQuery = dbQuery.gte('created_at', query.start_date);
  }
  if (query.end_date) {
    dbQuery = dbQuery.lte('created_at', query.end_date);
  }
  if (query.action) {
    dbQuery = dbQuery.eq('action', query.action);
  }
  if (query.user_id) {
    dbQuery = dbQuery.eq('user_id', query.user_id);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  const { data: logRecords, error, count } = await dbQuery;

  if (error) {
    throw new Error('查询审计日志失败');
  }

  const rows = (logRecords || []) as AuditLogRow[];
  const userIds = Array.from(new Set(rows.map((log) => log.user_id)));
  let userMap = new Map<string, { username: string }>();

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds);

    if (users) {
      const userRows = users as UserRow[];
      userMap = new Map(userRows.map((user) => [user.id, { username: user.username || '未知用户' }]));
    }
  }

  const logs: AuditLog[] = rows.map((log) => ({
    id: log.id,
    team_id: log.team_id,
    user_id: log.user_id,
    action: log.action as AuditAction,
    target_type: log.target_type,
    target_id: log.target_id,
    old_value: log.old_value ? JSON.parse(log.old_value) : null,
    new_value: log.new_value ? JSON.parse(log.new_value) : null,
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    created_at: log.created_at,
    user: userMap.get(log.user_id),
  }));

  return {
    logs,
    total: count || 0,
    page,
    limit,
  };
}
