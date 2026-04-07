import { getUsageLogs, type UsageLog } from '@/lib/oneapi';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';

type OrgApiKeySyncRow = Database['public']['Tables']['org_api_key_sync']['Row'];
type OrgRuntimeSyncJobRow = Database['public']['Tables']['org_runtime_sync_jobs']['Row'];
type OrgRuntimeSyncJobInsert = Database['public']['Tables']['org_runtime_sync_jobs']['Insert'];
type OrgRuntimeSyncJobUpdate = Database['public']['Tables']['org_runtime_sync_jobs']['Update'];
type OrgRuntimeSyncCursorRow = Database['public']['Tables']['org_runtime_sync_cursors']['Row'];
type OrgUsageLedgerInsert = Database['public']['Tables']['org_usage_ledger']['Insert'];

const USAGE_SYNC_PAGE_SIZE = 100;
const USAGE_SYNC_MAX_PAGES = 10;

function extractUsageLogs(data: unknown): UsageLog[] {
  if (Array.isArray(data)) {
    return data as UsageLog[];
  }

  if (
    data &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as { items?: unknown[] }).items)
  ) {
    return (data as { items: UsageLog[] }).items;
  }

  return [];
}

function getUsageCursorKey(runtimeTokenId: number): string {
  return `runtime_token:${runtimeTokenId}`;
}

function usageLogTimestamp(log: UsageLog): number {
  return Number(log.created_time || 0) * 1000;
}

async function getUsageCursor(teamId: string, cursorKey: string): Promise<OrgRuntimeSyncCursorRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_sync_cursors')
    .select('*')
    .eq('team_id', teamId)
    .eq('entity_type', 'usage_pull')
    .eq('cursor_key', cursorKey)
    .maybeSingle();

  if (error) {
    throw new Error('获取运行时同步游标失败');
  }

  return data as OrgRuntimeSyncCursorRow | null;
}

async function upsertUsageCursor(params: {
  teamId: string;
  cursorKey: string;
  cursorValue: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('org_runtime_sync_cursors')
    .upsert(
      {
        team_id: params.teamId,
        entity_type: 'usage_pull',
        cursor_key: params.cursorKey,
        cursor_value: params.cursorValue,
        metadata: params.metadata || {},
        last_synced_at: new Date().toISOString(),
      } as never,
      {
        onConflict: 'team_id,entity_type,cursor_key',
      }
    );

  if (error) {
    throw new Error(error.message || '更新运行时同步游标失败');
  }
}

export async function createOrgRuntimeSyncJob(input: OrgRuntimeSyncJobInsert): Promise<OrgRuntimeSyncJobRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_sync_jobs')
    .insert(input as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '创建组织运行时同步任务失败');
  }

  return data as OrgRuntimeSyncJobRow;
}

export async function updateOrgRuntimeSyncJob(id: number, input: OrgRuntimeSyncJobUpdate): Promise<OrgRuntimeSyncJobRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_sync_jobs')
    .update(input as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新组织运行时同步任务失败');
  }

  return data as OrgRuntimeSyncJobRow;
}

async function getOrgRuntimeSyncJob(id: number): Promise<OrgRuntimeSyncJobRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_sync_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(error?.message || '获取组织运行时同步任务失败');
  }

  return data as OrgRuntimeSyncJobRow;
}

async function findExistingUsagePullJob(teamId: string): Promise<OrgRuntimeSyncJobRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_sync_jobs')
    .select('*')
    .eq('entity_type', 'usage_pull')
    .in('status', ['pending', 'processing'])
    .contains('request_payload', { team_id: teamId })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '查询组织用量同步任务失败');
  }

  return (data as OrgRuntimeSyncJobRow | null) || null;
}

async function claimPendingJob(jobId: number): Promise<OrgRuntimeSyncJobRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('org_runtime_sync_jobs')
    .update({
      status: 'processing',
      attempt_count: 1,
      last_attempt_at: now,
    } as never)
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '锁定组织运行时同步任务失败');
  }

  return (data as OrgRuntimeSyncJobRow | null) || null;
}

export async function enqueueTeamUsagePullJob(teamId: string): Promise<OrgRuntimeSyncJobRow> {
  const existing = await findExistingUsagePullJob(teamId);
  if (existing) {
    return existing;
  }

  return createOrgRuntimeSyncJob({
    entity_type: 'usage_pull',
    entity_id: 0,
    action: 'resync',
    status: 'pending',
    request_payload: {
      team_id: teamId,
    },
  });
}

async function pullUsageForToken(params: {
  teamId: string;
  orgApiKeyId: number;
  runtimeTokenId: number;
}) {
  const cursorKey = getUsageCursorKey(params.runtimeTokenId);
  const cursor = await getUsageCursor(params.teamId, cursorKey);
  const cursorTimestamp = cursor?.cursor_value ? new Date(cursor.cursor_value).getTime() : 0;

  let newestTimestamp = cursorTimestamp;

  for (let page = 0; page < USAGE_SYNC_MAX_PAGES; page += 1) {
    const result = await getUsageLogs(page, USAGE_SYNC_PAGE_SIZE, params.runtimeTokenId);
    if (!result.success) {
      throw new Error(result.message || '拉取运行时用量日志失败');
    }

    const logs = extractUsageLogs(result.data);
    if (logs.length === 0) {
      break;
    }

    const freshLogs = logs.filter((log) => usageLogTimestamp(log) > cursorTimestamp);

    if (freshLogs.length > 0) {
      const inserts = freshLogs.map<OrgUsageLedgerInsert>((log) => ({
        team_id: params.teamId,
        org_api_key_id: params.orgApiKeyId,
        new_api_log_id: log.id,
        model: log.model_name,
        provider: null,
        request_count: 1,
        prompt_tokens: Number(log.prompt_tokens || 0),
        completion_tokens: Number(log.completion_tokens || 0),
        total_tokens: Number(log.prompt_tokens || 0) + Number(log.completion_tokens || 0),
        amount: Number(log.quota || 0),
        currency: 'USD',
        occurred_at: new Date(log.created_time * 1000).toISOString(),
      }));

      const supabase = createServerAdminSupabaseClient();
      const { error } = await supabase
        .from('org_usage_ledger')
        .upsert(inserts as never, {
          onConflict: 'team_id,new_api_log_id',
          ignoreDuplicates: true,
        });

      if (error) {
        throw new Error(error.message || '写入组织用量账本失败');
      }
    }

    for (const log of logs) {
      newestTimestamp = Math.max(newestTimestamp, usageLogTimestamp(log));
    }

    const reachedKnownRange = logs.some((log) => usageLogTimestamp(log) <= cursorTimestamp);
    if (reachedKnownRange || logs.length < USAGE_SYNC_PAGE_SIZE) {
      break;
    }
  }

  if (newestTimestamp > cursorTimestamp) {
    await upsertUsageCursor({
      teamId: params.teamId,
      cursorKey,
      cursorValue: new Date(newestTimestamp).toISOString(),
      metadata: {
        runtime_token_id: params.runtimeTokenId,
        org_api_key_id: params.orgApiKeyId,
      },
    });
  }
}

async function processUsagePullJob(job: OrgRuntimeSyncJobRow): Promise<void> {
  const requestPayload = (job.request_payload || {}) as Record<string, unknown>;
  const teamId = typeof requestPayload.team_id === 'string' ? requestPayload.team_id : null;

  if (!teamId) {
    throw new Error('用量同步任务缺少 team_id');
  }

  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_api_key_sync')
    .select('org_api_key_id,new_api_token_id')
    .eq('sync_status', 'synced');

  if (error) {
    throw new Error(error.message || '查询组织运行时令牌映射失败');
  }

  const syncRecords = (data || []) as Array<{
    org_api_key_id: OrgApiKeySyncRow['org_api_key_id'];
    new_api_token_id: OrgApiKeySyncRow['new_api_token_id'];
  }>;

  const orgApiKeyIds = syncRecords.map((record) => record.org_api_key_id);
  if (orgApiKeyIds.length === 0) {
    return;
  }

  const { data: orgApiKeys, error: orgApiKeysError } = await supabase
    .from('org_api_keys')
    .select('id,team_id')
    .in('id', orgApiKeyIds);

  if (orgApiKeysError) {
    throw new Error(orgApiKeysError.message || '查询组织 API Key 归属失败');
  }

  const keyTeamMap = new Map<number, string>(
    (orgApiKeys || []).map((record) => [record.id, record.team_id])
  );

  const teamSyncRecords = syncRecords.filter(
    (record) => keyTeamMap.get(record.org_api_key_id) === teamId && typeof record.new_api_token_id === 'number'
  );

  for (const syncRecord of teamSyncRecords) {
    await pullUsageForToken({
      teamId,
      orgApiKeyId: syncRecord.org_api_key_id,
      runtimeTokenId: syncRecord.new_api_token_id as number,
    });
  }
}

export async function processOrgRuntimeSyncJob(jobId: number): Promise<OrgRuntimeSyncJobRow> {
  const current = await getOrgRuntimeSyncJob(jobId);
  const job = current.status === 'pending' ? (await claimPendingJob(jobId)) || current : current;

  if (job.status === 'completed') {
    return job;
  }

  if (job.status === 'processing' && current.status !== 'pending') {
    return job;
  }

  try {
    if (job.entity_type === 'usage_pull') {
      await processUsagePullJob(job);
    } else {
      throw new Error(`暂不支持处理 ${job.entity_type} 类型的运行时同步任务`);
    }

    return updateOrgRuntimeSyncJob(job.id, {
      status: 'completed',
      error_message: null,
      response_payload: {
        synced: true,
      },
      last_attempt_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '组织运行时同步失败';
    return updateOrgRuntimeSyncJob(job.id, {
      status: 'failed',
      error_message: message,
      attempt_count: (job.attempt_count || 0) + 1,
      last_attempt_at: new Date().toISOString(),
    });
  }
}

export async function synchronizeTeamUsageLedgerNow(teamId: string): Promise<void> {
  const job = await enqueueTeamUsagePullJob(teamId);
  const processed = await processOrgRuntimeSyncJob(job.id);

  if (processed.status === 'failed') {
    throw new Error(processed.error_message || '组织用量同步失败');
  }
}
