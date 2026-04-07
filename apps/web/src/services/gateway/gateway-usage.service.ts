import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import type { GatewayUsageStats } from './gateway-types';

export type ListGatewayUsageOptions = {
  userId: string;
  teamId?: string | null;
  page?: number;
  limit?: number;
  tokenId?: number;
  model?: string;
};

type OrgApiKeyRow = Database['public']['Tables']['org_api_keys']['Row'];
type OrgApiKeySyncRow = Database['public']['Tables']['org_api_key_sync']['Row'];
type OrgUsageLedgerRow = Database['public']['Tables']['org_usage_ledger']['Row'];

function buildUsageStats(params: {
  usageRows: Array<Pick<OrgUsageLedgerRow, 'amount' | 'request_count'>>;
  activeKeys: Array<Pick<OrgApiKeyRow, 'quota' | 'used_quota' | 'unlimited_quota'>>;
}): GatewayUsageStats {
  const { usageRows, activeKeys } = params;
  const hasUnlimitedQuota = activeKeys.some((key) => key.unlimited_quota);
  const totalQuota = hasUnlimitedQuota
    ? activeKeys.reduce((sum, key) => sum + Number(key.used_quota || 0), 0)
    : activeKeys.reduce((sum, key) => sum + Math.max(0, Number(key.quota || 0)), 0);
  const usedQuota = usageRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const requestCount = usageRows.reduce((sum, row) => sum + Number(row.request_count || 0), 0);

  return {
    total_quota: totalQuota,
    used_quota: usedQuota,
    remaining_quota: hasUnlimitedQuota ? totalQuota : Math.max(0, totalQuota - usedQuota),
    request_count: requestCount,
  };
}

export async function listGatewayUsageForTeam(options: {
  teamId: string;
  page?: number;
  limit?: number;
  tokenId?: number;
  model?: string;
}) {
  const { teamId, page = 0, limit = 20, tokenId, model } = options;
  const supabase = createServerAdminSupabaseClient();
  let resolvedOrgApiKeyId: number | null = null;
  if (tokenId) {
    const { data: syncRowData, error: syncError } = await supabase
      .from('org_api_key_sync')
      .select('org_api_key_id')
      .eq('new_api_token_id', tokenId)
      .maybeSingle();
    const syncRow = syncRowData as Pick<OrgApiKeySyncRow, 'org_api_key_id'> | null;

    if (syncError) {
      throw new Error('获取组织用量日志失败');
    }

    if (syncRow?.org_api_key_id) {
      resolvedOrgApiKeyId = syncRow.org_api_key_id;
    }
  }

  const buildLedgerQuery = <TSelect extends string>(select: TSelect) => {
    let query = supabase
      .from('org_usage_ledger')
      .select(select)
      .eq('team_id', teamId);

    if (model) {
      query = query.eq('model', model);
    }

    if (resolvedOrgApiKeyId) {
      query = query.eq('org_api_key_id', resolvedOrgApiKeyId);
    }

    return query;
  };

  const [usageRowsResult, statRowsResult, keyRowsResult] = await Promise.all([
    buildLedgerQuery('*')
      .order('occurred_at', { ascending: false })
      .range(page * limit, page * limit + limit - 1),
    buildLedgerQuery('amount, request_count'),
    supabase
      .from('org_api_keys')
      .select('quota, used_quota, unlimited_quota')
      .eq('team_id', teamId)
      .eq('status', 'active'),
  ]);

  const { data: usageRows, error } = usageRowsResult;
  if (error) {
    throw new Error('获取组织用量日志失败');
  }

  const { data: statRows, error: statError } = statRowsResult;
  if (statError) {
    throw new Error('获取组织用量统计失败');
  }

  const { data: keyRows, error: keyRowsError } = keyRowsResult;
  if (keyRowsError) {
    throw new Error('获取组织用量统计失败');
  }

  const rows = (usageRows || []) as OrgUsageLedgerRow[];

  const usageStatRows = (statRows || []) as Array<Pick<OrgUsageLedgerRow, 'amount' | 'request_count'>>;
  const activeKeys = (keyRows || []) as Array<Pick<OrgApiKeyRow, 'quota' | 'used_quota' | 'unlimited_quota'>>;
  const stats = buildUsageStats({ usageRows: usageStatRows, activeKeys });

  return {
    logs: rows.map((row) => ({
      id: row.new_api_log_id ?? row.id,
      model: row.model,
      prompt_tokens: row.prompt_tokens,
      completion_tokens: row.completion_tokens,
      total_tokens: row.total_tokens,
      quota_cost: Number(row.amount),
      token_name: `Key #${row.org_api_key_id ?? '-'}`,
      created_at: row.occurred_at,
    })),
    stats,
    page,
    limit,
  };
}

export async function listGatewayUsage(options: ListGatewayUsageOptions) {
  const { userId, teamId, page = 0, limit = 20, tokenId, model } = options;
  const teamContext = await resolveAccessibleTeamContext(userId, teamId);

  return listGatewayUsageForTeam({
    teamId: teamContext.teamId,
    page,
    limit,
    tokenId,
    model,
  });
}
