import {
  generateRandomPassword,
  generateRuntimeUserAccessToken,
  getUser,
  loginRuntimeUser,
  type OneApiUser,
  updateUser,
} from '@/lib/oneapi';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import { ensureNewApiLink, getAppUserById } from './app-user.service';

type UserRow = Database['public']['Tables']['users']['Row'];

function buildPersonalRuntimeUsername(userId: string): string {
  const compact = userId.replace(/-/g, '').toLowerCase();
  return `agu_${compact.slice(0, 16)}`;
}

async function updateLocalRuntimeCredentials(
  userId: string,
  input: Database['public']['Tables']['users']['Update']
): Promise<UserRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .update(input as never)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新个人运行时账户失败');
  }

  return data as UserRow;
}

async function rotateRuntimePassword(runtimeUser: OneApiUser, nextPassword: string) {
  const result = await updateUser({
    id: runtimeUser.id,
    username: runtimeUser.username,
    password: nextPassword,
    display_name: runtimeUser.display_name,
    email: runtimeUser.email,
    role: runtimeUser.role,
    status: runtimeUser.status,
    quota: runtimeUser.quota,
    group: runtimeUser.group,
  });

  if (!result.success) {
    throw new Error(result.message || '重置个人运行时密码失败');
  }
}

async function getRuntimeUserOrThrow(newApiUserId: number): Promise<OneApiUser> {
  const result = await getUser(newApiUserId);
  if (!result.success || !result.data) {
    throw new Error(result.message || '获取个人运行时用户失败');
  }
  return result.data;
}

export async function ensurePersonalRuntimeAccount(userId: string): Promise<{ newApiUserId: number; accessToken: string }> {
  const existing = await getAppUserById(userId);
  if (!existing) {
    throw new Error('用户不存在');
  }

  const linkedUser = await ensureNewApiLink(existing);
  if (!linkedUser.new_api_user_id) {
    throw new Error('个人运行时账户映射失败');
  }

  const runtimeUser = await getRuntimeUserOrThrow(linkedUser.new_api_user_id);
  const runtimeUsername = linkedUser.runtime_username?.trim() || runtimeUser.username || buildPersonalRuntimeUsername(linkedUser.id);

  let effectiveUser = linkedUser;
  if (effectiveUser.runtime_username !== runtimeUsername) {
    effectiveUser = await updateLocalRuntimeCredentials(userId, {
      runtime_username: runtimeUsername,
    });
  }

  if (effectiveUser.runtime_access_token) {
    return {
      newApiUserId: linkedUser.new_api_user_id,
      accessToken: effectiveUser.runtime_access_token,
    };
  }

  let runtimePassword = effectiveUser.runtime_password?.trim();
  if (!runtimePassword) {
    runtimePassword = generateRandomPassword(16);
    await rotateRuntimePassword(runtimeUser, runtimePassword);
    effectiveUser = await updateLocalRuntimeCredentials(userId, {
      runtime_username: runtimeUsername,
      runtime_password: runtimePassword,
      runtime_access_token: null,
    });
  }

  let loginResult = await loginRuntimeUser(runtimeUsername, runtimePassword);
  if (!loginResult.success || !loginResult.cookie) {
    runtimePassword = generateRandomPassword(16);
    await rotateRuntimePassword(runtimeUser, runtimePassword);
    effectiveUser = await updateLocalRuntimeCredentials(userId, {
      runtime_username: runtimeUsername,
      runtime_password: runtimePassword,
      runtime_access_token: null,
    });
    loginResult = await loginRuntimeUser(runtimeUsername, runtimePassword);
  }

  if (!loginResult.success || !loginResult.cookie) {
    throw new Error(loginResult.message || '个人运行时账户登录失败');
  }

  const tokenResult = await generateRuntimeUserAccessToken(linkedUser.new_api_user_id, loginResult.cookie);
  if (!tokenResult.success || !tokenResult.data) {
    throw new Error(tokenResult.message || '生成个人运行时 access token 失败');
  }

  const updated = await updateLocalRuntimeCredentials(userId, {
    runtime_username: runtimeUsername,
    runtime_password: runtimePassword,
    runtime_access_token: tokenResult.data,
  });

  return {
    newApiUserId: linkedUser.new_api_user_id,
    accessToken: updated.runtime_access_token || tokenResult.data,
  };
}
