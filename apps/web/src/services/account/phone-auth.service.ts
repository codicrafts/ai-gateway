import { createHash, timingSafeEqual } from 'crypto';
import { createServerAdminSupabaseClient } from '@/lib/supabase';
import { validateMainlandPhone, normalizeMainlandPhone } from '@/utils/helpers';

export type PhoneVerificationPurpose = 'register' | 'login' | 'bind_phone' | 'reset_password' | 'auth';
type PhoneVerificationCodeRow = {
  id: string;
  code_hash: string;
  metadata: Record<string, unknown>;
};

const CODE_TTL_MINUTES = 10;

function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function normalizePhoneForAuth(phone: string): string {
  return normalizeMainlandPhone(phone);
}

export function validatePhoneForAuth(phone: string): boolean {
  return validateMainlandPhone(phone);
}

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issuePhoneVerificationCode(
  phone: string,
  purpose: PhoneVerificationPurpose,
  options: { metadata?: Record<string, unknown> } = {},
): Promise<{ expiresAt: string; debugCode?: string }> {
  const normalizedPhone = normalizePhoneForAuth(phone);
  if (!validatePhoneForAuth(normalizedPhone)) {
    throw new Error('请输入有效的中国大陆手机号');
  }

  const supabase = createServerAdminSupabaseClient();
  const code = process.env.PHONE_AUTH_DEBUG_CODE || generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  await supabase
    .from('phone_verification_codes')
    .delete()
    .eq('phone', normalizedPhone)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const { error } = await supabase
    .from('phone_verification_codes')
    .insert({
      phone: normalizedPhone,
      purpose,
      code_hash: hashVerificationCode(code),
      expires_at: expiresAt,
      metadata: options.metadata || {},
    } as never);

  if (error) {
    throw new Error('发送验证码失败');
  }

  const shouldExposeDebugCode = process.env.NODE_ENV !== 'production' || process.env.PHONE_AUTH_DEBUG_CODE;
  return {
    expiresAt,
    debugCode: shouldExposeDebugCode ? code : undefined,
  };
}

export async function verifyPhoneVerificationCode(
  phone: string,
  purpose: PhoneVerificationPurpose,
  code: string,
  expectedMetadata: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const normalizedPhone = normalizePhoneForAuth(phone);
  if (!validatePhoneForAuth(normalizedPhone)) {
    throw new Error('请输入有效的中国大陆手机号');
  }

  const supabase = createServerAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('phone_verification_codes')
    .select('*')
    .eq('phone', normalizedPhone)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const verificationCode = data as PhoneVerificationCodeRow | null;

  if (error || !verificationCode) {
    throw new Error('验证码无效或已过期');
  }

  const incomingHash = Buffer.from(hashVerificationCode(code), 'hex');
  const storedHash = Buffer.from(verificationCode.code_hash, 'hex');
  if (incomingHash.length !== storedHash.length || !timingSafeEqual(incomingHash, storedHash)) {
    throw new Error('验证码错误');
  }

  for (const [key, value] of Object.entries(expectedMetadata)) {
    if (verificationCode.metadata?.[key] !== value) {
      throw new Error('验证码上下文不匹配');
    }
  }

  const { error: consumeError } = await supabase
    .from('phone_verification_codes')
    .update({ consumed_at: now } as never)
    .eq('id', verificationCode.id);

  if (consumeError) {
    throw new Error('验证码校验失败');
  }

  return verificationCode.metadata || {};
}
