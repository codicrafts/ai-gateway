import {
  createTokenForUser,
  createRuntimeUserToken,
  deleteTokenForUser,
  deleteRuntimeUserToken,
  getUserTokens,
  getRuntimeUserTokens,
  setTokenStatusForUser,
  setRuntimeUserTokenStatus,
  updateTokenForUser,
  updateRuntimeUserToken,
  type CreateTokenRequest,
  type OneApiToken,
  type UpdateTokenRequest,
} from '@/lib/oneapi';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import type { GatewayApiKey } from '@/services/gateway/gateway-types';
import { ensureNewApiLink, getAppUserById } from '@/services/account/app-user.service';
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

type RuntimeTarget =
  | {
      kind: 'team';
      newApiUserId: number;
      accessToken: string;
    }
  | {
      kind: 'personal';
      newApiUserId: number;
    };

async function resolveRuntimeTarget(
  key: Pick<OrgApiKeyRow, 'team_id' | 'user_id'>,
  actingUserId: string,
): Promise<RuntimeTarget> {
  if (key.team_id) {
    const runtimeAccount = await ensureTeamRuntimeAccount({
      teamId: key.team_id,
      actingUserId,
    });
    return {
      kind: 'team',
      newApiUserId: runtimeAccount.newApiUserId,
      accessToken: runtimeAccount.accessToken,
    };
  }

  if (!key.user_id) {
    throw new Error('API Key 归属信息缺失');
  }

  const appUser = await getAppUserById(key.user_id);
  if (!appUser) {
    throw new Error('API Key 归属用户不存在');
  }

  const linkedUser = await ensureNewApiLink(appUser);
  if (!linkedUser.new_api_user_id) {
    throw new Error('个人运行时账户映射失败');
  }

  return {
    kind: 'personal',
    newApiUserId: linkedUser.new_api_user_id,
  };
}

async function loadRuntimeTokens(target: RuntimeTarget): Promise<OneApiToken[]> {
  const result =
    target.kind === 'team'
      ? await getRuntimeUserTokens(target.newApiUserId, target.accessToken)
      : await getUserTokens(target.newApiUserId);
  if (!result.success) {
    throw new Error(result.message || '获取运行时 Token 列表失败');
  }

  return extractTokenList(result.data);
}

async function resolveRuntimeToken(params: {
  target: RuntimeTarget;
  tokenId: number | null;
  name: string;
}): Promise<OneApiToken | null> {
  const tokens = await loadRuntimeTokens(params.target);

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
  const currentKey = await getLocalKey(params.orgApiKeyId);
  const job = await createOrgRuntimeSyncJob({
    entity_type: 'api_key',
    entity_id: params.orgApiKeyId,
    action: params.action,
    status: 'processing',
    request_payload: {
      org_api_key_id: params.orgApiKeyId,
      team_id: currentKey.team_id,
      owner_user_id: currentKey.user_id,
      user_id: params.actingUserId,
    },
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
  });

  try {
    const currentSync = await getSyncRecord(params.orgApiKeyId);
    const runtimeTarget = await resolveRuntimeTarget(currentKey, params.actingUserId);

    if (params.action === 'delete') {
      if (currentSync?.new_api_token_id) {
        const runtimeDelete =
          runtimeTarget.kind === 'team'
            ? await deleteRuntimeUserToken(
                runtimeTarget.newApiUserId,
                runtimeTarget.accessToken,
                currentSync.new_api_token_id,
              )
            : await deleteTokenForUser(
                runtimeTarget.newApiUserId,
                currentSync.new_api_token_id,
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

      const createResult =
        runtimeTarget.kind === 'team'
          ? await createRuntimeUserToken(
              runtimeTarget.newApiUserId,
              runtimeTarget.accessToken,
              tokenRequest,
            )
          : await createTokenForUser(runtimeTarget.newApiUserId, tokenRequest);
      if (!createResult.success) {
        throw new Error(createResult.message || '同步到运行时失败');
      }

      runtimeToken =
        createResult.data ||
        (await resolveRuntimeToken({
          target: runtimeTarget,
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
        const statusResult =
          runtimeTarget.kind === 'team'
            ? await setRuntimeUserTokenStatus(
                runtimeTarget.newApiUserId,
                runtimeTarget.accessToken,
                runtimeTokenId,
                currentKey.status === 'active' ? 1 : 2,
              )
            : await setTokenStatusForUser(
                runtimeTarget.newApiUserId,
                runtimeTokenId,
                currentKey.status === 'active' ? 1 : 2,
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

      const updateResult =
        runtimeTarget.kind === 'team'
          ? await updateRuntimeUserToken(
              runtimeTarget.newApiUserId,
              runtimeTarget.accessToken,
              tokenUpdate,
            )
          : await updateTokenForUser(runtimeTarget.newApiUserId, tokenUpdate);
      if (!updateResult.success) {
        throw new Error(updateResult.message || '同步更新运行时 API Key 失败');
      }

      runtimeToken = await resolveRuntimeToken({
        target: runtimeTarget,
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
