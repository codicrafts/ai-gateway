import { getQuotaPerUnit, getUsageLogsByUsername, type UsageLog } from '@/lib/oneapi';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';

type OrgApiKeySyncRow = Database['public']['Tables']['org_api_key_sync']['Row'];
type OrgRuntimeSyncJobRow = Database['public']['Tables']['org_runtime_sync_jobs']['Row'];
type OrgRuntimeSyncJobInsert = Database['public']['Tables']['org_runtime_sync_jobs']['Insert'];
type OrgRuntimeSyncJobUpdate = Database['public']['Tables']['org_runtime_sync_jobs']['Update'];
type OrgRuntimeSyncCursorRow = Database['public']['Tables']['org_runtime_sync_cursors']['Row'];
type OrgRuntimeAccountRow = Database['public']['Tables']['org_runtime_accounts']['Row'];
type OrgUsageLedgerInsert = Database['public']['Tables']['org_usage_ledger']['Insert'];

const USAGE_SYNC_PAGE_SIZE = 100;
const USAGE_SYNC_MAX_PAGES = 10;
const NEW_API_LOG_TYPE_CONSUME = 2;
const NEW_API_LOG_TYPE_ERROR = 5;

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

function usageLogCreatedAt(log: UsageLog): number {
  const raw = log.created_at ?? log.created_time ?? 0;
  return Number(raw || 0);
}

function usageLogTimestamp(log: UsageLog): number {
  return usageLogCreatedAt(log) * 1000;
}

function usageLogTokenId(log: UsageLog): number {
  return Number(log.token_id || 0);
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
  const existing = await getUsageCursor(params.teamId, params.cursorKey);
  const payload = {
    team_id: params.teamId,
    entity_type: 'usage_pull',
    cursor_key: params.cursorKey,
    cursor_value: params.cursorValue,
    metadata: params.metadata || {},
    last_synced_at: new Date().toISOString(),
  } as const;

  const query = existing
    ? supabase
        .from('org_runtime_sync_cursors')
        .update(payload as never)
        .eq('id', existing.id)
    : supabase.from('org_runtime_sync_cursors').insert(payload as never);

  const { error } = await query;

  if (error) {
    throw new Error(error.message || '更新运行时同步游标失败');
  }
}

async function getTeamRuntimeAccount(teamId: string): Promise<OrgRuntimeAccountRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_accounts')
    .select('*')
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '获取团队运行时账户失败');
  }

  return (data as OrgRuntimeAccountRow | null) || null;
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

async function pullUsageForTeam(params: {
  teamId: string;
  runtimeUsername: string;
  syncRecords: Array<{ orgApiKeyId: number; runtimeTokenId: number }>;
}): Promise<{ insertedCount: number; cursorUpdates: number }> {
  const quotaPerUnit = await getQuotaPerUnit();
  const cursorEntries = await Promise.all(
    params.syncRecords.map(async (record) => {
      const cursorKey = getUsageCursorKey(record.runtimeTokenId);
      const cursor = await getUsageCursor(params.teamId, cursorKey);
      return {
        orgApiKeyId: record.orgApiKeyId,
        runtimeTokenId: record.runtimeTokenId,
        cursorKey,
        cursorTimestamp: cursor?.cursor_value ? new Date(cursor.cursor_value).getTime() : 0,
        newestTimestamp: cursor?.cursor_value ? new Date(cursor.cursor_value).getTime() : 0,
      };
    })
  );

  const tokenCursorMap = new Map(
    cursorEntries.map((entry) => [entry.runtimeTokenId, entry])
  );
  const oldestCursorTimestamp = cursorEntries.reduce(
    (min, entry) => Math.min(min, entry.cursorTimestamp),
    Number.POSITIVE_INFINITY
  );
  const inserts: OrgUsageLedgerInsert[] = [];
  const candidates = new Map<number, OrgUsageLedgerInsert>();
  const staleLogIds = new Set<number>();

  for (let page = 0; page < USAGE_SYNC_MAX_PAGES; page += 1) {
    const result = await getUsageLogsByUsername(page, USAGE_SYNC_PAGE_SIZE, params.runtimeUsername);
    if (!result.success) {
      throw new Error(result.message || '拉取运行时用量日志失败');
    }

    const logs = extractUsageLogs(result.data);
    if (logs.length === 0) {
      break;
    }

    for (const log of logs) {
      const entry = tokenCursorMap.get(usageLogTokenId(log));
      if (!entry) {
        continue;
      }

      const logTimestamp = usageLogTimestamp(log);
      if (logTimestamp > entry.cursorTimestamp) {
        entry.newestTimestamp = Math.max(entry.newestTimestamp, logTimestamp);
      }

      const logType = Number(log.type || 0);

      if (logType !== NEW_API_LOG_TYPE_CONSUME && logType !== NEW_API_LOG_TYPE_ERROR) {
        staleLogIds.add(Number(log.id));
        continue;
      }

      const isSuccessLog = logType === NEW_API_LOG_TYPE_CONSUME;

      const record = {
        team_id: params.teamId,
        org_api_key_id: entry.orgApiKeyId,
        new_api_log_id: log.id,
        model: log.model_name,
        provider: null,
        request_count: 1,
        prompt_tokens: Number(log.prompt_tokens || 0),
        completion_tokens: Number(log.completion_tokens || 0),
        total_tokens: Number(log.prompt_tokens || 0) + Number(log.completion_tokens || 0),
        amount: isSuccessLog ? Number(log.quota || 0) / quotaPerUnit : 0,
        currency: 'USD',
        status: isSuccessLog ? 'success' : 'failed',
        error_message: isSuccessLog ? null : (log.content || 'upstream_error'),
        occurred_at: new Date(usageLogCreatedAt(log) * 1000).toISOString(),
      } satisfies OrgUsageLedgerInsert;

      candidates.set(record.new_api_log_id, record);

      if (logTimestamp > entry.cursorTimestamp) {
        inserts.push(record);
      }
    }

    const reachedKnownRange =
      Number.isFinite(oldestCursorTimestamp) &&
      logs.some((log) => usageLogTimestamp(log) <= oldestCursorTimestamp);

    if (reachedKnownRange || logs.length < USAGE_SYNC_PAGE_SIZE) {
      break;
    }
  }

  let insertedCount = 0;
  let updatedCount = 0;

  if (candidates.size > 0 || staleLogIds.size > 0) {
    const supabase = createServerAdminSupabaseClient();
    const logIds = Array.from(
      new Set(Array.from(candidates.keys()).concat(Array.from(staleLogIds)))
    );
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('org_usage_ledger')
      .select('id,new_api_log_id,amount,prompt_tokens,completion_tokens,total_tokens,occurred_at,status,error_message')
      .eq('team_id', params.teamId)
      .in('new_api_log_id', logIds);

    if (existingRowsError) {
      throw new Error(existingRowsError.message || '查询组织用量账本失败');
    }

    const existingRowMap = new Map(
      ((existingRows || []) as Array<{
        id: number;
        new_api_log_id: number;
        amount: number;
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        occurred_at: string;
        status: 'success' | 'failed';
        error_message: string | null;
      }>).map((row) => [Number(row.new_api_log_id), row])
    );
    const staleExistingIds = Array.from(staleLogIds)
      .map((logId) => existingRowMap.get(logId)?.id)
      .filter((value): value is number => typeof value === 'number');

    if (staleExistingIds.length > 0) {
      const { error } = await supabase
        .from('org_usage_ledger')
        .delete()
        .in('id', staleExistingIds);

      if (error) {
        throw new Error(error.message || '清理失败请求用量账本失败');
      }
    }

    const newInserts = Array.from(candidates.values()).filter(
      (insert) => !existingRowMap.has(Number(insert.new_api_log_id))
    );
    insertedCount = newInserts.length;

    if (newInserts.length > 0) {
      const { error } = await supabase
        .from('org_usage_ledger')
        .insert(newInserts as never);

      if (error) {
        throw new Error(error.message || '写入组织用量账本失败');
      }
    }

    const updates = Array.from(candidates.values()).filter((insert) =>
      existingRowMap.has(Number(insert.new_api_log_id))
    );

    for (const update of updates) {
      const existing = existingRowMap.get(Number(update.new_api_log_id));
      if (!existing) {
        continue;
      }

      const sameAmount = Number(existing.amount || 0) === Number(update.amount || 0);
      const samePromptTokens = Number(existing.prompt_tokens || 0) === Number(update.prompt_tokens || 0);
      const sameCompletionTokens = Number(existing.completion_tokens || 0) === Number(update.completion_tokens || 0);
      const sameTotalTokens = Number(existing.total_tokens || 0) === Number(update.total_tokens || 0);
      const sameOccurredAt = existing.occurred_at === update.occurred_at;
      const sameStatus = existing.status === update.status;
      const sameErrorMessage = (existing.error_message || null) === (update.error_message || null);

      if (sameAmount && samePromptTokens && sameCompletionTokens && sameTotalTokens && sameOccurredAt && sameStatus && sameErrorMessage) {
        continue;
      }

      const { error } = await supabase
        .from('org_usage_ledger')
        .update({
          amount: update.amount,
          prompt_tokens: update.prompt_tokens,
          completion_tokens: update.completion_tokens,
          total_tokens: update.total_tokens,
          status: update.status,
          error_message: update.error_message,
          occurred_at: update.occurred_at,
        } as never)
        .eq('id', existing.id);

      if (error) {
        throw new Error(error.message || '更新组织用量账本失败');
      }

      updatedCount += 1;
    }
  }

  const cursorUpdates = cursorEntries.filter((entry) => entry.newestTimestamp > entry.cursorTimestamp);

  await Promise.all(
    cursorUpdates.map((entry) =>
      upsertUsageCursor({
        teamId: params.teamId,
        cursorKey: entry.cursorKey,
        cursorValue: new Date(entry.newestTimestamp).toISOString(),
        metadata: {
          runtime_token_id: entry.runtimeTokenId,
          org_api_key_id: entry.orgApiKeyId,
        },
      })
    )
  );

  return {
    insertedCount: insertedCount + updatedCount,
    cursorUpdates: cursorUpdates.length,
  };
}

async function processUsagePullJob(job: OrgRuntimeSyncJobRow): Promise<{ insertedCount: number; cursorUpdates: number }> {
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
    return {
      insertedCount: 0,
      cursorUpdates: 0,
    };
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

  if (teamSyncRecords.length === 0) {
    return {
      insertedCount: 0,
      cursorUpdates: 0,
    };
  }

  const runtimeAccount = await getTeamRuntimeAccount(teamId);
  if (!runtimeAccount?.runtime_username) {
    throw new Error('团队运行时账户未初始化');
  }

  return pullUsageForTeam({
    teamId,
    runtimeUsername: runtimeAccount.runtime_username,
    syncRecords: teamSyncRecords.map((record) => ({
      orgApiKeyId: record.org_api_key_id,
      runtimeTokenId: record.new_api_token_id as number,
    })),
  });
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
    let responsePayload: Record<string, unknown> = {
      synced: true,
    };

    if (job.entity_type === 'usage_pull') {
      const usageSyncResult = await processUsagePullJob(job);
      responsePayload = {
        ...responsePayload,
        inserted_count: usageSyncResult.insertedCount,
        cursor_updates: usageSyncResult.cursorUpdates,
      };
    } else {
      throw new Error(`暂不支持处理 ${job.entity_type} 类型的运行时同步任务`);
    }

    return updateOrgRuntimeSyncJob(job.id, {
      status: 'completed',
      error_message: null,
      response_payload: responsePayload,
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
