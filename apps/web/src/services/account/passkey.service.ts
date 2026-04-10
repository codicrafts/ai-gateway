import { getAppUserByNewApiUserId, sanitizeAppUser } from './app-user.service';
import { ensurePersonalRuntimeAccount } from './personal-runtime-account.service';

const ONE_API_URL = process.env.ONE_API_URL || 'http://localhost:3001';
const PASSKEY_LOGIN_COOKIE = 'agw_passkey_login_session';

type OneApiPasskeyResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type PasskeyStatus = {
  enabled: boolean;
  last_used_at?: string | null;
};

function getPasskeyHeaders(userId: number, accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'New-Api-User': String(userId),
  };
}

async function parseOneApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const result = (await response.json().catch(() => null)) as OneApiPasskeyResponse<T> | null;
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || fallbackMessage);
  }
  return (result.data as T) ?? ({} as T);
}

export async function getPasskeyStatus(userId: string): Promise<PasskeyStatus> {
  const runtime = await ensurePersonalRuntimeAccount(userId);
  const response = await fetch(`${ONE_API_URL}/api/user/passkey`, {
    method: 'GET',
    headers: getPasskeyHeaders(runtime.newApiUserId, runtime.accessToken),
    cache: 'no-store',
  });

  return parseOneApiResponse<PasskeyStatus>(response, '获取 Passkey 状态失败');
}

export async function beginPasskeyRegistration(userId: string): Promise<unknown> {
  const runtime = await ensurePersonalRuntimeAccount(userId);
  const response = await fetch(`${ONE_API_URL}/api/user/passkey/register/begin`, {
    method: 'POST',
    headers: getPasskeyHeaders(runtime.newApiUserId, runtime.accessToken),
  });

  const data = await parseOneApiResponse<{ options: unknown }>(response, '初始化 Passkey 失败');
  return data.options;
}

export async function finishPasskeyRegistration(userId: string, payload: unknown): Promise<void> {
  const runtime = await ensurePersonalRuntimeAccount(userId);
  const response = await fetch(`${ONE_API_URL}/api/user/passkey/register/finish`, {
    method: 'POST',
    headers: getPasskeyHeaders(runtime.newApiUserId, runtime.accessToken),
    body: JSON.stringify(payload),
  });

  await parseOneApiResponse(response, '完成 Passkey 注册失败');
}

export async function deletePasskey(userId: string): Promise<void> {
  const runtime = await ensurePersonalRuntimeAccount(userId);
  const response = await fetch(`${ONE_API_URL}/api/user/passkey`, {
    method: 'DELETE',
    headers: getPasskeyHeaders(runtime.newApiUserId, runtime.accessToken),
  });

  await parseOneApiResponse(response, '解绑 Passkey 失败');
}

export async function beginPasskeyLogin(): Promise<{ options: unknown; sessionCookie: string }> {
  const response = await fetch(`${ONE_API_URL}/api/user/passkey/login/begin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = (await response.json().catch(() => null)) as OneApiPasskeyResponse<{ options: unknown }> | null;
  const rawSetCookie = response.headers.get('set-cookie') || '';
  const sessionCookie = rawSetCookie.split(';')[0] || '';
  if (!response.ok || !result?.success || !result.data?.options || !sessionCookie) {
    throw new Error(result?.message || '初始化 Passkey 登录失败');
  }

  return {
    options: result.data.options,
    sessionCookie,
  };
}

export async function finishPasskeyLogin(payload: unknown, sessionCookie: string) {
  const response = await fetch(`${ONE_API_URL}/api/user/passkey/login/finish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseOneApiResponse<{ id?: number }>(response, '完成 Passkey 登录失败');
  const newApiUserId = Number(data.id || 0);
  if (!Number.isFinite(newApiUserId) || newApiUserId <= 0) {
    throw new Error('Passkey 登录返回的用户信息无效');
  }

  const appUser = await getAppUserByNewApiUserId(newApiUserId);
  if (!appUser) {
    throw new Error('当前 Passkey 尚未绑定到 MeshRouter 账户');
  }

  return sanitizeAppUser(appUser);
}

export function getPasskeyLoginCookieName(): string {
  return PASSKEY_LOGIN_COOKIE;
}
