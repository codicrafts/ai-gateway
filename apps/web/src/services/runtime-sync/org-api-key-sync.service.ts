import {
  createRuntimeUserToken,
  deleteRuntimeUserToken,
  getRuntimeUserTokens,
  setRuntimeUserTokenStatus,
  updateRuntimeUserToken,
  type CreateTokenRequest,
  type OneApiToken,
  type UpdateTokenRequest,
} from '@/lib/oneapi';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import type { GatewayApiKey } from '@/services/gateway/gateway-types';
import { createOrgRuntimeSyncJob, updateOrgRuntimeSyncJob } from './org-runtime-sync.service';
import { ensureTeamRuntimeAccount } from './org-runtime-account.service';

type OrgApiKeyRow = Database['public']['Tables']['org_api_keys']['Row'];
type OrgApiKeySyncRow = Database['public']['Tables']['org_api_key_sync']['Row'];

function extractTokenList(data: unknown): OneApiToken[] {
  if (Array.isArray(data)) {
    return data as OneApiToken[];
  }

  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: OneApiToken[] }).items;
  }

  return [];
}

function toUnixTimestamp(value: string | null | undefined): number {
  if (!value) {
    return -1;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('过期时间格式无效');
  }

  return Math.floor(parsed.getTime() / 1000);
}

function mapTokenStatus(status: number): GatewayApiKey['status'] {
  switch (status) {
    case 1:
      return 'active';
    case 2:
      return 'disabled';
    case 3:
      return 'expired';
    case 4:
      return 'exhausted';
    default:
      return 'disabled';
  }
}

async function getLocalKey(orgApiKeyId: number): Promise<OrgApiKeyRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_api_keys')
    .select('*')
    .eq('id', orgApiKeyId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || '获取组织 API Key 失败');
  }

  return data as OrgApiKeyRow;
}

async function getSyncRecord(orgApiKeyId: number): Promise<OrgApiKeySyncRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_api_key_sync')
    .select('*')
    .eq('org_api_key_id', orgApiKeyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '获取 API Key 同步状态失败');
  }

  return (data as OrgApiKeySyncRow | null) || null;
}

async function updateSyncRecord(
  orgApiKeyId: number,
  input: Database['public']['Tables']['org_api_key_sync']['Update']
) {
  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('org_api_key_sync')
    .update(input as never)
    .eq('org_api_key_id', orgApiKeyId);

  if (error) {
    throw new Error(error.message || '更新 API Key 同步状态失败');
  }
}

async function updateLocalKey(
  id: number,
  input: Database['public']['Tables']['org_api_keys']['Update']
): Promise<OrgApiKeyRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_api_keys')
    .update(input as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新组织 API Key 失败');
  }

  return data as OrgApiKeyRow;
}

async function loadRuntimeTokens(newApiUserId: number, accessToken: string): Promise<OneApiToken[]> {
  const result = await getRuntimeUserTokens(newApiUserId, accessToken);
  if (!result.success) {
    throw new Error(result.message || '获取运行时 Token 列表失败');
  }

  return extractTokenList(result.data);
}

async function resolveRuntimeToken(params: {
  newApiUserId: number;
  accessToken: string;
  tokenId: number | null;
  name: string;
}): Promise<OneApiToken | null> {
  const tokens = await loadRuntimeTokens(params.newApiUserId, params.accessToken);

  if (params.tokenId !== null) {
    const exact = tokens.find((token) => token.id === params.tokenId);
    if (exact) {
      return exact;
    }
  }

  const candidates = tokens
    .filter((token) => token.name === params.name)
    .sort((left, right) => right.created_time - left.created_time);

  return candidates[0] || null;
}

type SyncOrgApiKeyNowParams = {
  orgApiKeyId: number;
  actingUserId: string;
  teamId: string;
  action: 'create' | 'update' | 'delete' | 'resync';
};

type SyncOrgApiKeyNowResult =
  | {
      action: 'create' | 'update' | 'resync';
      key: OrgApiKeyRow;
      sync: OrgApiKeySyncRow;
    }
  | {
      action: 'delete';
      runtimeTokenId: number | null;
    };

export async function syncOrgApiKeyNow(params: SyncOrgApiKeyNowParams): Promise<SyncOrgApiKeyNowResult> {
  const job = await createOrgRuntimeSyncJob({
    entity_type: 'api_key',
    entity_id: params.orgApiKeyId,
    action: params.action,
    status: 'processing',
    request_payload: {
      org_api_key_id: params.orgApiKeyId,
      team_id: params.teamId,
      user_id: params.actingUserId,
    },
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
  });

  try {
    const currentKey = await getLocalKey(params.orgApiKeyId);
    const currentSync = await getSyncRecord(params.orgApiKeyId);

    if (params.action === 'delete') {
      if (currentSync?.new_api_token_id) {
        const runtimeAccount = await ensureTeamRuntimeAccount({
          teamId: params.teamId,
          actingUserId: params.actingUserId,
        });
        const runtimeDelete = await deleteRuntimeUserToken(
          runtimeAccount.newApiUserId,
          runtimeAccount.accessToken,
          currentSync.new_api_token_id
        );
        if (!runtimeDelete.success) {
          throw new Error(runtimeDelete.message || '删除运行时 API Key 失败');
        }
      }

      await updateOrgRuntimeSyncJob(job.id, {
        status: 'completed',
        response_payload: {
          deleted: true,
          new_api_token_id: currentSync?.new_api_token_id ?? null,
        },
        last_attempt_at: new Date().toISOString(),
      });

      return {
        action: 'delete',
        runtimeTokenId: currentSync?.new_api_token_id ?? null,
      };
    }

    await updateSyncRecord(params.orgApiKeyId, {
      sync_status: 'syncing',
      sync_error: null,
    });

    const runtimeAccount = await ensureTeamRuntimeAccount({
      teamId: params.teamId,
      actingUserId: params.actingUserId,
    });
    const runtimeUserId = runtimeAccount.newApiUserId;
    const runtimeAccessToken = runtimeAccount.accessToken;
    const shouldCreateRuntimeToken = !currentSync?.new_api_token_id || params.action === 'create';

    let runtimeToken: OneApiToken | null = null;

    if (shouldCreateRuntimeToken) {
      const tokenRequest: CreateTokenRequest = {
        name: currentKey.name,
        remain_quota: Number(currentKey.quota),
        unlimited_quota: currentKey.unlimited_quota,
        models: currentKey.models,
        subnet: currentKey.subnet ?? undefined,
        permission_scopes: currentKey.permission_scopes ?? [],
        expired_time: toUnixTimestamp(currentKey.expires_at),
      };

      const createResult = await createRuntimeUserToken(runtimeUserId, runtimeAccessToken, tokenRequest);
      if (!createResult.success) {
        throw new Error(createResult.message || '同步到运行时失败');
      }

      runtimeToken =
        createResult.data ||
        (await resolveRuntimeToken({
          newApiUserId: runtimeUserId,
          accessToken: runtimeAccessToken,
          tokenId: null,
          name: currentKey.name,
        }));

      if (!runtimeToken) {
        throw new Error('API Key 已创建，但运行时回查失败');
      }
    } else {
      const runtimeTokenId = currentSync.new_api_token_id;
      if (typeof runtimeTokenId !== 'number') {
        throw new Error('运行时令牌未同步，请重新创建 API Key');
      }

      if (currentKey.status !== undefined) {
        const statusResult = await setRuntimeUserTokenStatus(
          runtimeUserId,
          runtimeAccessToken,
          runtimeTokenId,
          currentKey.status === 'active' ? 1 : 2
        );
        if (!statusResult.success) {
          throw new Error(statusResult.message || '更新运行时 API Key 状态失败');
        }
      }

      const tokenUpdate: UpdateTokenRequest = {
        id: runtimeTokenId,
        name: currentKey.name,
        remain_quota: Number(currentKey.quota),
        unlimited_quota: currentKey.unlimited_quota,
        models: currentKey.models,
        subnet: currentKey.subnet ?? undefined,
        permission_scopes: currentKey.permission_scopes ?? [],
        expired_time: toUnixTimestamp(currentKey.expires_at),
      };

      const updateResult = await updateRuntimeUserToken(runtimeUserId, runtimeAccessToken, tokenUpdate);
      if (!updateResult.success) {
        throw new Error(updateResult.message || '同步更新运行时 API Key 失败');
      }

      runtimeToken = await resolveRuntimeToken({
        newApiUserId: runtimeUserId,
        accessToken: runtimeAccessToken,
        tokenId: runtimeTokenId,
        name: currentKey.name,
      });
    }

    const nextStatus = runtimeToken ? mapTokenStatus(runtimeToken.status) : currentKey.status;
    const refreshedKey = await updateLocalKey(params.orgApiKeyId, {
      status: nextStatus,
      used_quota: runtimeToken?.used_quota ?? currentKey.used_quota,
      updated_by: params.actingUserId,
    });

    await updateSyncRecord(params.orgApiKeyId, {
      new_api_token_id: runtimeToken?.id ?? currentSync?.new_api_token_id ?? null,
      runtime_key: runtimeToken?.key ?? currentSync?.runtime_key ?? null,
      sync_status: 'synced',
      sync_error: null,
      last_synced_at: new Date().toISOString(),
    });

    const refreshedSync = await getSyncRecord(params.orgApiKeyId);
    if (!refreshedSync) {
      throw new Error('刷新 API Key 同步状态失败');
    }

    await updateOrgRuntimeSyncJob(job.id, {
      status: 'completed',
      response_payload: {
        synced: true,
        new_api_token_id: refreshedSync.new_api_token_id,
      },
      last_attempt_at: new Date().toISOString(),
    });

    return {
      action: params.action,
      key: refreshedKey,
      sync: refreshedSync,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '同步组织 API Key 失败';

    await updateSyncRecord(params.orgApiKeyId, {
      sync_status: 'failed',
      sync_error: message,
      last_synced_at: new Date().toISOString(),
    }).catch(() => undefined);

    await updateOrgRuntimeSyncJob(job.id, {
      status: 'failed',
      error_message: message,
      last_attempt_at: new Date().toISOString(),
    });

    throw new Error(message);
  }
}
