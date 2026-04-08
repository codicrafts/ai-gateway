import { createAuditLog, type ClientInfo } from '@/lib/auditLog';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import { fetchGatewayRuntimeTokenKey } from '@/lib/oneapi';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import { ensureTeamRuntimeAccount } from '@/services/runtime-sync/org-runtime-account.service';
import { syncOrgApiKeyNow } from '@/services/runtime-sync/org-api-key-sync.service';
import type { TeamRole } from '@ai-gateway/shared-types/team';
import type {
  CreateGatewayApiKeyInput,
  GatewayApiKey,
  UpdateGatewayApiKeyInput,
} from './gateway-types';

type OrgApiKeyRow = Database['public']['Tables']['org_api_keys']['Row'];
type OrgApiKeyInsert = Database['public']['Tables']['org_api_keys']['Insert'];
type OrgApiKeySyncRow = Database['public']['Tables']['org_api_key_sync']['Row'];

const API_KEY_PERMISSION_SCOPES = [
  'chat',
  'responses',
  'embeddings',
  'images',
  'audio',
  'rerank',
  'models.read',
] as const;

type ApiKeyPermissionScope = (typeof API_KEY_PERMISSION_SCOPES)[number];

function ensureManagePermission(role: TeamRole) {
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('当前角色无权管理 API Key');
  }
}

function mapOrgApiKeyToGatewayApiKey(key: OrgApiKeyRow, sync: OrgApiKeySyncRow | null): GatewayApiKey {
  return {
    id: key.id,
    name: key.name,
    key: sync?.runtime_key || '同步中',
    plain_key: null,
    status: key.status,
    created_at: key.created_at,
    expires_at: key.expires_at,
    quota: Number(key.quota),
    used_quota: Number(key.used_quota),
    unlimited_quota: key.unlimited_quota,
    models: key.models || [],
    request_count: 0,
    total_tokens: 0,
    spent_amount: 0,
    remark: key.remark,
    subnet: key.subnet,
    permission_scopes: key.permission_scopes || [],
    last_full_key_viewed_at: key.last_full_key_viewed_at,
  };
}

function normalizeName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('API Key 名称不能为空');
  }
  if (normalized.length > 100) {
    throw new Error('API Key 名称不能超过 100 个字符');
  }
  return normalized;
}

function normalizeRemark(value?: string | null): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return null;
  }
  if (normalized.length > 500) {
    throw new Error('备注说明不能超过 500 个字符');
  }
  return normalized;
}

function normalizeModels(models?: string[] | null): string[] {
  if (!models || models.length === 0) {
    return [];
  }
  return Array.from(
    new Set(
      models
        .map((model) => model.trim())
        .filter((model) => model.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right));
}

function normalizePermissionScopes(scopes?: string[] | null): ApiKeyPermissionScope[] {
  if (!scopes || scopes.length === 0) {
    return [];
  }

  const filteredScopes = scopes
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  if (!filteredScopes.every((scope) => API_KEY_PERMISSION_SCOPES.includes(scope as ApiKeyPermissionScope))) {
    throw new Error('存在无效的权限范围配置');
  }

  return Array.from(new Set(filteredScopes)) as ApiKeyPermissionScope[];
}

function normalizeSubnet(value?: string | null): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return null;
  }

  const entries = Array.from(
    new Set(
      normalized
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

  if (entries.length === 0) {
    return null;
  }

  const subnetPattern = /^[0-9a-fA-F.:/]+$/;
  if (!entries.every((entry) => subnetPattern.test(entry))) {
    throw new Error('IP 白名单格式无效');
  }

  return entries.join(',');
}

function toAuditSnapshot(key: OrgApiKeyRow, sync: OrgApiKeySyncRow | null) {
  return {
    name: key.name,
    remark: key.remark,
    status: key.status,
    expires_at: key.expires_at,
    quota: Number(key.quota),
    used_quota: Number(key.used_quota),
    unlimited_quota: key.unlimited_quota,
    models: key.models || [],
    subnet: key.subnet,
    permission_scopes: key.permission_scopes || [],
    sync_status: sync?.sync_status ?? null,
    runtime_token_id: sync?.new_api_token_id ?? null,
    last_full_key_viewed_at: key.last_full_key_viewed_at,
  };
}

async function writeApiKeyAuditLog(params: {
  action: 'api_key.create' | 'api_key.update' | 'api_key.delete' | 'api_key.reveal';
  teamId: string;
  userId: string;
  keyId: number;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  clientInfo?: ClientInfo;
}) {
  await createAuditLog({
    team_id: params.teamId,
    user_id: params.userId,
    action: params.action,
    target_type: 'api_key',
    target_id: String(params.keyId),
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    ip_address: params.clientInfo?.ip_address ?? null,
    user_agent: params.clientInfo?.user_agent ?? null,
  });
}

export async function listGatewayApiKeysForTeam(teamId: string): Promise<GatewayApiKey[]> {
  const supabase = createServerAdminSupabaseClient();

  const { data: keyRows, error } = await supabase
    .from('org_api_keys')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });
  const keys = (keyRows || []) as unknown as OrgApiKeyRow[];

  if (error) {
    throw new Error('获取 API Key 列表失败');
  }

  if (!keys.length) {
    return [];
  }

  const { data: syncData, error: syncError } = await supabase
    .from('org_api_key_sync')
    .select('*')
    .in('org_api_key_id', keys.map((key) => key.id));
  const syncRows = (syncData || []) as unknown as OrgApiKeySyncRow[];

  if (syncError) {
    throw new Error('获取 API Key 同步信息失败');
  }

  const { data: usageRowsData, error: usageRowsError } = await supabase
    .from('org_usage_ledger')
    .select('org_api_key_id,amount,total_tokens,request_count')
    .eq('team_id', teamId)
    .eq('status', 'success')
    .in('org_api_key_id', keys.map((key) => key.id));

  if (usageRowsError) {
    throw new Error('获取 API Key 用量统计失败');
  }

  const syncMap = new Map((syncRows || []).map((row) => [row.org_api_key_id, row]));
  const usageMap = new Map<number, { spentAmount: number; requestCount: number; totalTokens: number }>();

  for (const row of usageRowsData || []) {
    const orgApiKeyId = typeof row.org_api_key_id === 'number' ? row.org_api_key_id : null;
    if (!orgApiKeyId) continue;

    const current = usageMap.get(orgApiKeyId) || { spentAmount: 0, requestCount: 0, totalTokens: 0 };
    current.spentAmount += Number(row.amount || 0);
    current.requestCount += Number(row.request_count || 0);
    current.totalTokens += Number(row.total_tokens || 0);
    usageMap.set(orgApiKeyId, current);
  }

  return keys.map((key) => {
    const gatewayKey = mapOrgApiKeyToGatewayApiKey(key, syncMap.get(key.id) || null);
    const usage = usageMap.get(key.id);

    if (!usage) {
      return gatewayKey;
    }

    return {
      ...gatewayKey,
      used_quota: usage.spentAmount,
      spent_amount: usage.spentAmount,
      request_count: usage.requestCount,
      total_tokens: usage.totalTokens,
    };
  });
}


async function updateLocalKey(
  id: number,
  input: Database['public']['Tables']['org_api_keys']['Update']
): Promise<OrgApiKeyRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data: keyData, error } = await supabase
    .from('org_api_keys')
    .update(input as never)
    .eq('id', id)
    .select('*')
    .single();
  const data = keyData as unknown as OrgApiKeyRow | null;

  if (error || !data) {
    throw new Error(error?.message || '更新组织 API Key 失败');
  }

  return data;
}

async function getLocalKeyOrThrow(id: number, teamId: string): Promise<OrgApiKeyRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data: keyData, error } = await supabase
    .from('org_api_keys')
    .select('*')
    .eq('id', id)
    .eq('team_id', teamId)
    .maybeSingle();
  const data = keyData as unknown as OrgApiKeyRow | null;

  if (error) {
    throw new Error('获取组织 API Key 失败');
  }

  if (!data) {
    throw new Error('API Key 不存在');
  }

  return data;
}

async function getSyncRecord(orgApiKeyId: number): Promise<OrgApiKeySyncRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_api_key_sync')
    .select('*')
    .eq('org_api_key_id', orgApiKeyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '获取 API Key 同步信息失败');
  }

  return (data as OrgApiKeySyncRow | null) || null;
}

export async function listGatewayApiKeys(params: {
  userId: string;
  teamId?: string | null;
}): Promise<GatewayApiKey[]> {
  const context = await resolveAccessibleTeamContext(params.userId, params.teamId);
  return listGatewayApiKeysForTeam(context.teamId);
}

export async function createGatewayApiKey(params: {
  userId: string;
  teamId?: string | null;
  input: CreateGatewayApiKeyInput;
  clientInfo?: ClientInfo;
}): Promise<GatewayApiKey> {
  const { input } = params;
  const context = await resolveAccessibleTeamContext(params.userId, params.teamId);
  ensureManagePermission(context.role);

  const normalizedName = normalizeName(input.name);
  const normalizedRemark = normalizeRemark(input.remark);
  const normalizedModels = normalizeModels(input.models);
  const normalizedSubnet = normalizeSubnet(input.subnet);
  const normalizedScopes = normalizePermissionScopes(input.permission_scopes);
  const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error('过期时间格式无效');
  }

  const supabase = createServerAdminSupabaseClient();
  const insertPayload: OrgApiKeyInsert = {
    team_id: context.teamId,
    name: normalizedName,
    remark: normalizedRemark,
    subnet: normalizedSubnet,
    permission_scopes: normalizedScopes,
    status: 'active',
    expires_at: expiresAt?.toISOString() ?? null,
    quota: input.quota ?? -1,
    used_quota: 0,
    unlimited_quota: input.unlimited_quota ?? true,
    models: normalizedModels,
    created_by: params.userId,
    updated_by: params.userId,
  };

  const { data: createdKeyData, error: createError } = await supabase
    .from('org_api_keys')
    .insert(insertPayload as never)
    .select('*')
    .single();
  const createdKey = createdKeyData as unknown as OrgApiKeyRow | null;

  if (createError || !createdKey) {
    throw new Error(createError?.message || '创建组织 API Key 失败');
  }

  const { error: syncInsertError } = await supabase
    .from('org_api_key_sync')
    .insert({
      org_api_key_id: createdKey.id,
      sync_status: 'pending',
    } as never);

  if (syncInsertError) {
    throw new Error(syncInsertError.message || '创建 API Key 同步记录失败');
  }

  const syncResult = await syncOrgApiKeyNow({
    orgApiKeyId: createdKey.id,
    actingUserId: params.userId,
    teamId: context.teamId,
    action: 'create',
  });

  if (syncResult.action === 'delete') {
    throw new Error('API Key 同步结果异常');
  }

  const nextKey = mapOrgApiKeyToGatewayApiKey(syncResult.key, syncResult.sync);
  const runtimeTokenId = syncResult.sync.new_api_token_id;

  if (typeof runtimeTokenId === 'number') {
    try {
      const fullKey = await getGatewayApiKeySecret({
        userId: params.userId,
        teamId: context.teamId,
        id: createdKey.id,
        clientInfo: params.clientInfo,
        skipAudit: true,
      });
      nextKey.plain_key = fullKey;
    } catch {
      nextKey.plain_key = null;
    }
  }

  await writeApiKeyAuditLog({
    action: 'api_key.create',
    teamId: context.teamId,
    userId: params.userId,
    keyId: createdKey.id,
    newValue: {
      ...toAuditSnapshot(syncResult.key, syncResult.sync),
      full_key_issued_on_create: Boolean(nextKey.plain_key),
    },
    clientInfo: params.clientInfo,
  });

  return nextKey;
}

export async function updateGatewayApiKey(params: {
  userId: string;
  teamId?: string | null;
  input: UpdateGatewayApiKeyInput;
  clientInfo?: ClientInfo;
}): Promise<void> {
  const context = await resolveAccessibleTeamContext(params.userId, params.teamId);
  ensureManagePermission(context.role);

  const currentKey = await getLocalKeyOrThrow(params.input.id, context.teamId);
  const currentSync = await getSyncRecord(currentKey.id);
  const currentSnapshot = toAuditSnapshot(currentKey, currentSync);
  const normalizedName = params.input.name === undefined ? currentKey.name : normalizeName(params.input.name);
  const normalizedRemark =
    params.input.remark === undefined ? currentKey.remark : normalizeRemark(params.input.remark);
  const normalizedModels =
    params.input.models === undefined ? currentKey.models : normalizeModels(params.input.models);
  const normalizedSubnet =
    params.input.subnet === undefined ? currentKey.subnet : normalizeSubnet(params.input.subnet);
  const normalizedScopes =
    params.input.permission_scopes === undefined
      ? (currentKey.permission_scopes || [])
      : normalizePermissionScopes(params.input.permission_scopes);

  const nextExpiresAt =
    params.input.expires_at === undefined
      ? currentKey.expires_at
      : params.input.expires_at === null
        ? null
        : new Date(params.input.expires_at).toISOString();

  if (params.input.expires_at && Number.isNaN(new Date(params.input.expires_at).getTime())) {
    throw new Error('过期时间格式无效');
  }

  const updatedLocal = await updateLocalKey(currentKey.id, {
    name: normalizedName,
    remark: normalizedRemark,
    subnet: normalizedSubnet,
    permission_scopes: normalizedScopes,
    status: params.input.status ?? currentKey.status,
    expires_at: nextExpiresAt,
    quota: params.input.quota ?? currentKey.quota,
    unlimited_quota: params.input.unlimited_quota ?? currentKey.unlimited_quota,
    models: normalizedModels,
    updated_by: params.userId,
  });

  const syncResult = await syncOrgApiKeyNow({
    orgApiKeyId: updatedLocal.id,
    actingUserId: params.userId,
    teamId: context.teamId,
    action: 'update',
  });

  if (syncResult.action === 'delete') {
    throw new Error('API Key 同步结果异常');
  }

  await writeApiKeyAuditLog({
    action: 'api_key.update',
    teamId: context.teamId,
    userId: params.userId,
    keyId: updatedLocal.id,
    oldValue: currentSnapshot,
    newValue: toAuditSnapshot(syncResult.key, syncResult.sync),
    clientInfo: params.clientInfo,
  });
}

export async function removeGatewayApiKey(params: {
  userId: string;
  teamId?: string | null;
  id: number;
  clientInfo?: ClientInfo;
}): Promise<void> {
  const context = await resolveAccessibleTeamContext(params.userId, params.teamId);
  ensureManagePermission(context.role);

  const currentKey = await getLocalKeyOrThrow(params.id, context.teamId);
  const currentSync = await getSyncRecord(currentKey.id);
  const currentSnapshot = toAuditSnapshot(currentKey, currentSync);

  await syncOrgApiKeyNow({
    orgApiKeyId: currentKey.id,
    actingUserId: params.userId,
    teamId: context.teamId,
    action: 'delete',
  });

  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('org_api_keys')
    .delete()
    .eq('id', currentKey.id)
    .eq('team_id', context.teamId);

  if (error) {
    throw new Error(error.message || '删除组织 API Key 失败');
  }

  await writeApiKeyAuditLog({
    action: 'api_key.delete',
    teamId: context.teamId,
    userId: params.userId,
    keyId: currentKey.id,
    oldValue: currentSnapshot,
    clientInfo: params.clientInfo,
  });
}

export async function getGatewayApiKeySecret(params: {
  userId: string;
  teamId?: string | null;
  id: number;
  clientInfo?: ClientInfo;
  skipAudit?: boolean;
}): Promise<string> {
  const context = await resolveAccessibleTeamContext(params.userId, params.teamId);
  ensureManagePermission(context.role);

  const currentKey = await getLocalKeyOrThrow(params.id, context.teamId);

  const supabase = createServerAdminSupabaseClient();
  const { data: syncData, error: syncError } = await supabase
    .from('org_api_key_sync')
    .select('*')
    .eq('org_api_key_id', params.id)
    .maybeSingle();
  const syncRow = syncData as unknown as OrgApiKeySyncRow | null;

  if (syncError) {
    throw new Error(syncError.message || '获取 API Key 同步信息失败');
  }

  if (!syncRow?.new_api_token_id) {
    throw new Error('运行时 API Key 尚未同步完成');
  }

  const runtimeAccount = await ensureTeamRuntimeAccount({
    teamId: context.teamId,
    actingUserId: params.userId,
  });

  const secret = await fetchGatewayRuntimeTokenKey(
    runtimeAccount.newApiUserId,
    runtimeAccount.accessToken,
    syncRow.new_api_token_id
  );

  const viewedAt = new Date().toISOString();
  const updatedKey = await updateLocalKey(currentKey.id, {
    last_full_key_viewed_at: viewedAt,
    last_full_key_viewed_by: params.userId,
    updated_by: params.userId,
  });

  if (!params.skipAudit) {
    await writeApiKeyAuditLog({
      action: 'api_key.reveal',
      teamId: context.teamId,
      userId: params.userId,
      keyId: currentKey.id,
      newValue: {
        ...toAuditSnapshot(updatedKey, syncRow),
        revealed_at: viewedAt,
      },
      clientInfo: params.clientInfo,
    });
  }

  return secret;
}
