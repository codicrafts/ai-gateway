import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { createServerAdminSupabaseClient, createServerSupabaseClient, type Database } from '@/lib/supabase';
import { ensureUserExists } from '@/lib/oneapi';
import { isPhoneIdentifier, normalizeMainlandPhone } from '@/utils/helpers';

type UserRow = Database['public']['Tables']['users']['Row'];

export type AppUser = {
  id: string;
  username: string;
  email: string | null;
  balance: number;
  created_at: string;
  provider: string | null;
  new_api_user_id: number | null;
  name: string | null;
  image: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  two_factor_enabled: boolean;
  two_factor_enabled_at: string | null;
};

export type BalanceUpdateResult = {
  user: AppUser;
  previousBalance: number;
  nextBalance: number;
};

type UpdateAppUserProfileInput = {
  name?: string | null;
  image?: string | null;
};

type UpsertOAuthUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: string | null;
};

type CreateLocalUserInput = {
  email?: string | null;
  phone?: string | null;
  username: string;
  password: string;
  balance?: number;
};

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';
const PASSWORD_RESET_WINDOW_MS = 1000 * 60 * 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function slugifyUsername(source: string): string {
  const base = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

  return base || `user_${Math.random().toString(36).slice(2, 8)}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyPassword(password: string, passwordHash: string | null | undefined): boolean {
  if (!passwordHash) {
    return false;
  }

  const [scheme, iterationsRaw, salt, storedHash] = passwordHash.split('$');
  if (scheme !== 'pbkdf2' || !iterationsRaw || !salt || !storedHash) {
    return false;
  }

  const derived = pbkdf2Sync(password, salt, Number(iterationsRaw), PBKDF2_KEYLEN, PBKDF2_DIGEST);
  const stored = Buffer.from(storedHash, 'hex');
  if (derived.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(derived, stored);
}

export function sanitizeAppUser(user: UserRow): AppUser {
  const emailLocalPart = user.email ? user.email.split('@')[0] : null;
  const phoneTail = user.phone ? user.phone.slice(-4) : null;

  return {
    id: user.id,
    username: user.username || user.name || emailLocalPart || (phoneTail ? `user_${phoneTail}` : `user_${user.id.slice(0, 8)}`),
    email: user.email,
    balance: Number(user.balance || 0),
    created_at: user.created_at,
    provider: user.provider,
    new_api_user_id: user.new_api_user_id,
    name: user.name,
    image: user.image,
    phone: user.phone,
    phone_verified_at: user.phone_verified_at,
    two_factor_enabled: Boolean(user.two_factor_enabled),
    two_factor_enabled_at: user.two_factor_enabled_at,
  };
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  const normalized = normalizeMainlandPhone(phone);
  return normalized.length > 0 ? normalized : null;
}

function buildRuntimeUsername(user: Pick<UserRow, 'id'>): string {
  const compactId = user.id.replace(/-/g, '').toLowerCase();
  return `agw_${compactId.slice(0, 16)}`;
}

export async function getAppUserByEmail(email: string): Promise<UserRow | null> {
  if (!email?.trim()) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const normalizedEmail = normalizeEmail(email);
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  return data;
}

export async function getAppUserByPhone(phone: string): Promise<UserRow | null> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('phone', normalizedPhone)
    .maybeSingle();

  return data;
}

export async function getAppUserById(id: string): Promise<UserRow | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function getAppUserByNewApiUserId(newApiUserId: number): Promise<UserRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('new_api_user_id', newApiUserId)
    .maybeSingle();

  return data;
}

async function generateUniqueUsername(seed: string): Promise<string> {
  const supabase = createServerSupabaseClient();
  const base = slugifyUsername(seed);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${base}${suffix}`.slice(0, 48);
    const { data } = await supabase.from('users').select('id').eq('username', candidate).maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `user_${Date.now()}`;
}

export async function ensureNewApiLink(user: UserRow): Promise<UserRow> {
  if (user.new_api_user_id) {
    return user;
  }

  const runtimeIdentifier = user.email || user.phone || `${user.id}@local.user`;
  const result = await ensureUserExists(
    runtimeIdentifier,
    user.name || user.username || undefined,
    buildRuntimeUsername(user)
  );
  if (!result.success || !result.user) {
    throw new Error(result.error || '运行时账户映射失败');
  }

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('users')
    .update({ new_api_user_id: result.user.id } as never)
    .eq('id', user.id)
    .select('*')
    .single();

  return data || user;
}

export async function upsertOAuthUser(input: UpsertOAuthUserInput): Promise<AppUser> {
  const supabase = createServerSupabaseClient();
  const email = normalizeEmail(input.email);
  const existing = await getAppUserByEmail(email);

  if (existing) {
    const updatePayload: Database['public']['Tables']['users']['Update'] = {
      provider: input.provider ?? existing.provider,
      name: input.name ?? existing.name,
      image: input.image ?? existing.image,
    };

    const { data } = await supabase
      .from('users')
      .update(updatePayload as never)
      .eq('id', existing.id)
      .select('*')
      .single();

    const linked = await ensureNewApiLink(data || existing);
    return sanitizeAppUser(linked);
  }

  const username = await generateUniqueUsername(input.name || email.split('@')[0]);
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      username,
      name: input.name ?? username,
      image: input.image ?? null,
      provider: input.provider ?? null,
      balance: 5,
    } as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('创建用户失败');
  }

  const linked = await ensureNewApiLink(data);
  return sanitizeAppUser(linked);
}

export async function createLocalUser(input: CreateLocalUserInput): Promise<AppUser> {
  const supabase = createServerSupabaseClient();
  const email = input.email?.trim() ? normalizeEmail(input.email) : null;
  const phone = normalizePhone(input.phone);

  if (!email && !phone) {
    throw new Error('请提供邮箱或手机号');
  }

  if (email) {
    const existingByEmail = await getAppUserByEmail(email);
    if (existingByEmail) {
      throw new Error('邮箱已存在');
    }
  }

  if (phone) {
    const existingByPhone = await getAppUserByPhone(phone);
    if (existingByPhone) {
      throw new Error('手机号已存在');
    }
  }

  const username = await generateUniqueUsername(input.username);
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      phone,
      username,
      name: username,
      password_hash: hashPassword(input.password),
      provider: 'credentials',
      balance: input.balance ?? 5,
    } as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('创建用户失败');
  }

  const linked = await ensureNewApiLink(data);
  return sanitizeAppUser(linked);
}

export async function authenticateLocalUser(email: string, password: string): Promise<AppUser | null> {
  const user = isPhoneIdentifier(email)
    ? await getAppUserByPhone(email)
    : await getAppUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const linked = await ensureNewApiLink(user);
  return sanitizeAppUser(linked);
}

export async function createPasswordResetRequest(email: string): Promise<{ issued: boolean; resetToken?: string; expiresAt?: string }> {
  const user = await getAppUserByEmail(email);

  if (!user) {
    return { issued: false };
  }

  const resetToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS).toISOString();
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('users')
    .update({
      password_reset_token_hash: hashPasswordResetToken(resetToken),
      password_reset_expires_at: expiresAt,
    } as never)
    .eq('id', user.id);

  if (error) {
    throw new Error('创建重置请求失败');
  }

  return {
    issued: true,
    resetToken,
    expiresAt,
  };
}

export async function resetPasswordWithToken(token: string, nextPassword: string): Promise<AppUser> {
  const supabase = createServerSupabaseClient();
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date().toISOString();

  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .eq('password_reset_token_hash', tokenHash)
    .gt('password_reset_expires_at', now)
    .maybeSingle();

  const user = userRecord as UserRow | null;

  if (!user) {
    throw new Error('重置链接无效或已过期');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      password_hash: hashPassword(nextPassword),
      password_reset_token_hash: null,
      password_reset_expires_at: null,
    } as never)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('重置密码失败');
  }

  const linked = await ensureNewApiLink(data);
  return sanitizeAppUser(linked);
}

export async function searchAppUsers(search?: string): Promise<AppUser[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase.from('users').select('*').order('created_at', { ascending: false });

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    query = query.or(`email.ilike.%${term}%,username.ilike.%${term}%,name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data } = await query;
  return (data || []).map(sanitizeAppUser);
}

export async function incrementUserBalance(userId: string, amount: number): Promise<BalanceUpdateResult> {
  const supabase = createServerSupabaseClient();
  const existing = await getAppUserById(userId);

  if (!existing) {
    throw new Error('用户不存在');
  }

  const previousBalance = Number(existing.balance || 0);
  const nextBalance = previousBalance + amount;
  const { data, error } = await supabase
    .from('users')
    .update({ balance: nextBalance } as never)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('更新账户余额失败');
  }

  return {
    user: sanitizeAppUser(data),
    previousBalance,
    nextBalance,
  };
}

export async function updateAppUserProfile(userId: string, input: UpdateAppUserProfileInput): Promise<AppUser> {
  const supabase = createServerAdminSupabaseClient();
  const existing = await getAppUserById(userId);

  if (!existing) {
    throw new Error('用户不存在');
  }

  const nextName = input.name?.trim() || existing.name || existing.username;
  if (!nextName) {
    throw new Error('昵称不能为空');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      name: nextName,
      image: input.image ?? existing.image,
    } as never)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('更新个人资料失败');
  }

  return sanitizeAppUser(data);
}

export async function bindPhoneForUser(params: {
  userId: string;
  phone: string;
}): Promise<AppUser> {
  const supabase = createServerAdminSupabaseClient();
  const normalizedPhone = normalizePhone(params.phone);

  if (!normalizedPhone) {
    throw new Error('手机号格式无效');
  }

  const { data: phoneOwner } = await supabase
    .from('users')
    .select('id')
    .eq('phone', normalizedPhone)
    .neq('id', params.userId)
    .maybeSingle();

  if (phoneOwner) {
    throw new Error('手机号已被占用');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      phone: normalizedPhone,
      phone_verified_at: new Date().toISOString(),
    } as never)
    .eq('id', params.userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('绑定手机号失败');
  }

  return sanitizeAppUser(data);
}

export async function configureUserTwoFactor(params: {
  userId: string;
  enabled: boolean;
  secret?: string | null;
  recoveryCodeHashes?: string[];
}): Promise<AppUser> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .update({
      two_factor_enabled: params.enabled,
      two_factor_secret: params.enabled ? params.secret ?? null : null,
      two_factor_enabled_at: params.enabled ? new Date().toISOString() : null,
      two_factor_recovery_codes: params.enabled ? params.recoveryCodeHashes ?? [] : [],
    } as never)
    .eq('id', params.userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(params.enabled ? '启用双因素认证失败' : '关闭双因素认证失败');
  }

  return sanitizeAppUser(data);
}

export async function changeLocalUserPassword(params: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
}): Promise<AppUser> {
  const supabase = createServerSupabaseClient();
  const user = await getAppUserById(params.userId);

  if (!user) {
    throw new Error('用户不存在');
  }

  if (!user.password_hash) {
    throw new Error('当前账号未启用密码登录');
  }

  if (!verifyPassword(params.currentPassword, user.password_hash)) {
    throw new Error('当前密码错误');
  }

  if (params.currentPassword === params.nextPassword) {
    throw new Error('新密码不能与当前密码相同');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      password_hash: hashPassword(params.nextPassword),
      password_reset_token_hash: null,
      password_reset_expires_at: null,
    } as never)
    .eq('id', params.userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('修改密码失败');
  }

  return sanitizeAppUser(data);
}

export async function deleteAppUserAccount(userId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const user = await getAppUserById(userId);

  if (!user) {
    throw new Error('用户不存在');
  }

  const { data: ownedTeam } = await supabase
    .from('teams')
    .select('id, name')
    .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  if (ownedTeam) {
    throw new Error('请先转让或删除你创建/拥有的团队');
  }

  await supabase.from('team_invitations').delete().eq('invited_by', userId);
  await supabase.from('team_members').delete().eq('user_id', userId);

  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw new Error('删除账户失败');
  }
}
