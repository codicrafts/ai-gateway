import {
  ensureUserExists,
  generateRandomPassword,
  generateRuntimeUserAccessToken,
  loginRuntimeUser,
  topUpUser,
  updateUser,
  type OneApiUser,
} from '@/lib/oneapi';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import { getOrganizationBalance } from '@/services/billing/billing.service';

type TeamRow = Database['public']['Tables']['teams']['Row'];
type OrgRuntimeAccountRow = Database['public']['Tables']['org_runtime_accounts']['Row'];

function buildTeamRuntimeUsername(teamId: string): string {
  const compact = teamId.replace(/-/g, '').toLowerCase();
  return `agt_${compact.slice(0, 12)}`;
}

function buildTeamRuntimeDisplayName(team: Pick<TeamRow, 'name'>): string {
  return `${team.name} Runtime`.slice(0, 20);
}

async function getTeam(teamId: string): Promise<TeamRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || '获取团队失败');
  }

  return data as TeamRow;
}

async function getRuntimeAccount(teamId: string): Promise<OrgRuntimeAccountRow | null> {
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

async function createRuntimeAccount(
  input: Database['public']['Tables']['org_runtime_accounts']['Insert']
) {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_accounts')
    .insert(input as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '保存团队运行时账户失败');
  }

  return data as OrgRuntimeAccountRow;
}

async function updateRuntimeAccount(
  teamId: string,
  input: Database['public']['Tables']['org_runtime_accounts']['Update']
) {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('org_runtime_accounts')
    .update(input as never)
    .eq('team_id', teamId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新团队运行时账户失败');
  }

  return data as OrgRuntimeAccountRow;
}

async function updateTeamRuntimeUserId(teamId: string, newApiUserId: number) {
  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('teams')
    .update({ new_api_user_id: newApiUserId } as never)
    .eq('id', teamId);

  if (error) {
    throw new Error(error.message || '更新团队运行时账户映射失败');
  }
}

function normalizeQuotaAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Number(value.toFixed(6)));
}

async function resetRuntimePassword(user: OneApiUser, nextPassword: string) {
  const result = await updateUser({
    id: user.id,
    username: user.username,
    password: nextPassword,
    display_name: user.display_name,
    email: user.email,
    role: user.role,
    status: user.status,
    quota: user.quota,
    group: user.group,
  });

  if (!result.success) {
    throw new Error(result.message || '重置团队运行时账户密码失败');
  }
}

async function ensureRuntimeAccessToken(
  account: OrgRuntimeAccountRow,
  runtimeUser: OneApiUser
): Promise<string> {
  if (account.runtime_access_token) {
    return account.runtime_access_token;
  }

  if (!account.new_api_user_id) {
    throw new Error('团队运行时账户未绑定 new-api 用户');
  }

  let effectiveAccount = account;
  let loginResult = await loginRuntimeUser(effectiveAccount.runtime_username, effectiveAccount.runtime_password);

  if (!loginResult.success || !loginResult.cookie) {
    const rotatedPassword = generateRandomPassword(16);
    await resetRuntimePassword(runtimeUser, rotatedPassword);
    effectiveAccount = await updateRuntimeAccount(account.team_id, {
      runtime_password: rotatedPassword,
      runtime_access_token: null,
      sync_status: 'syncing',
      sync_error: null,
      last_synced_at: new Date().toISOString(),
      updated_by: account.updated_by,
    });
    loginResult = await loginRuntimeUser(effectiveAccount.runtime_username, effectiveAccount.runtime_password);
  }

  if (!loginResult.success || !loginResult.cookie) {
    throw new Error(loginResult.message || '团队运行时账户登录失败');
  }

  const tokenResult = await generateRuntimeUserAccessToken(effectiveAccount.new_api_user_id!, loginResult.cookie);
  if (!tokenResult.success || !tokenResult.data) {
    throw new Error(tokenResult.message || '生成团队运行时 access token 失败');
  }

  const updated = await updateRuntimeAccount(account.team_id, {
    runtime_access_token: tokenResult.data,
    sync_status: 'synced',
    sync_error: null,
    last_synced_at: new Date().toISOString(),
    updated_by: account.updated_by,
  });

  return updated.runtime_access_token || tokenResult.data;
}

async function bootstrapTeamRuntimeQuota(
  account: OrgRuntimeAccountRow,
  runtimeUser: OneApiUser,
  actingUserId: string
): Promise<OrgRuntimeAccountRow> {
  const alreadyCredited = normalizeQuotaAmount(Number(account.runtime_quota_credit_total || 0));
  if (alreadyCredited > 0) {
    return account;
  }

  const organizationBalance = normalizeQuotaAmount(await getOrganizationBalance(account.team_id));
  if (organizationBalance <= 0) {
    return account;
  }

  const topUpResult = await topUpUser(runtimeUser.id, organizationBalance);
  if (!topUpResult.success) {
    throw new Error(topUpResult.message || '初始化团队运行时额度失败');
  }

  return updateRuntimeAccount(account.team_id, {
    runtime_quota_credit_total: organizationBalance,
    runtime_quota_bootstrapped_at: new Date().toISOString(),
    sync_status: 'synced',
    sync_error: null,
    last_synced_at: new Date().toISOString(),
    updated_by: actingUserId,
  });
}

export async function recordTeamRuntimeQuotaCredit(params: {
  teamId: string;
  amount: number;
  actingUserId: string;
}): Promise<OrgRuntimeAccountRow> {
  const account = await getRuntimeAccount(params.teamId);
  if (!account) {
    throw new Error('团队运行时账户不存在');
  }

  const nextTotal = normalizeQuotaAmount(
    Number(account.runtime_quota_credit_total || 0) + normalizeQuotaAmount(params.amount)
  );

  return updateRuntimeAccount(params.teamId, {
    runtime_quota_credit_total: nextTotal,
    sync_status: 'synced',
    sync_error: null,
    last_synced_at: new Date().toISOString(),
    updated_by: params.actingUserId,
  });
}

export async function ensureTeamRuntimeAccount(params: {
  teamId: string;
  actingUserId: string;
}): Promise<{ newApiUserId: number; accessToken: string }> {
  const team = await getTeam(params.teamId);
  const existing = await getRuntimeAccount(params.teamId);
  const runtimeUsername = existing?.runtime_username || buildTeamRuntimeUsername(params.teamId);
  const runtimePassword = existing?.runtime_password || generateRandomPassword(16);

  const ensuredUser = await ensureUserExists(
    runtimeUsername,
    buildTeamRuntimeDisplayName(team),
    runtimeUsername
  );

  if (!ensuredUser.success || !ensuredUser.user) {
    throw new Error(ensuredUser.error || '团队运行时账户映射失败');
  }

  const accountPayload = {
    new_api_user_id: ensuredUser.user.id,
    runtime_username: runtimeUsername,
    runtime_password: runtimePassword,
    sync_status: 'syncing' as const,
    sync_error: null,
    last_synced_at: new Date().toISOString(),
    updated_by: params.actingUserId,
  };

  const syncedAccount = existing
    ? await updateRuntimeAccount(params.teamId, accountPayload)
    : await createRuntimeAccount({
        team_id: params.teamId,
        ...accountPayload,
        created_by: params.actingUserId,
      });

  if (team.new_api_user_id !== ensuredUser.user.id) {
    await updateTeamRuntimeUserId(params.teamId, ensuredUser.user.id);
  }

  const quotaReadyAccount = await bootstrapTeamRuntimeQuota(
    syncedAccount,
    ensuredUser.user,
    params.actingUserId
  );
  const accessToken = await ensureRuntimeAccessToken(quotaReadyAccount, ensuredUser.user);

  if (!accessToken) {
    throw new Error('团队运行时 access token 不存在');
  }

  return {
    newApiUserId: ensuredUser.user.id,
    accessToken,
  };
}
