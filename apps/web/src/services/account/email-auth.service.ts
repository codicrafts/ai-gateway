import { createHash, timingSafeEqual } from 'crypto';
import type { ReactElement } from 'react';
import { AccountVerificationEmail } from '@/components/emails/AccountVerificationEmail';
import { PasswordResetEmail } from '@/components/emails/PasswordResetEmail';
import { isResendConfigured, sendResendEmail } from '@/lib/resend';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateEmail } from '@/utils/helpers';

export type EmailVerificationPurpose = 'auth';
type EmailVerificationCodeRow = {
  id: string;
  code_hash: string;
};

const CODE_TTL_MINUTES = 10;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isAccountEmailConfigured(): boolean {
  return isResendConfigured();
}

async function sendAccountEmail(payload: { to: string; subject: string; react: ReactElement }): Promise<void> {
  if (!isAccountEmailConfigured()) {
    return;
  }

  await sendResendEmail({
    to: payload.to,
    subject: payload.subject,
    react: payload.react,
    replyTo: process.env.RESEND_REPLY_TO_EMAIL || undefined,
  });
}

async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await sendAccountEmail({
    to: email,
    subject: '你的登录验证码',
    react: AccountVerificationEmail({ code }),
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, expiresAt?: string): Promise<void> {
  const expiryText = expiresAt
    ? `该链接将在 ${new Date(expiresAt).toLocaleString('zh-CN', { hour12: false })} 前有效。`
    : '该链接将在 1 小时内有效。';

  await sendAccountEmail({
    to: email,
    subject: '重置你的 MeshRouter 密码',
    react: PasswordResetEmail({ resetUrl, expiryText }),
  });
}

export async function issueEmailVerificationCode(
  email: string,
  purpose: EmailVerificationPurpose,
): Promise<{ expiresAt: string; debugCode?: string }> {
  const normalizedEmail = normalizeEmail(email);
  if (!validateEmail(normalizedEmail)) {
    throw new Error('请输入有效的邮箱地址');
  }

  const supabase = createServerSupabaseClient();
  const code = process.env.PHONE_AUTH_DEBUG_CODE || generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  await supabase
    .from('email_verification_codes')
    .delete()
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const { error } = await supabase
    .from('email_verification_codes')
    .insert({
      email: normalizedEmail,
      purpose,
      code_hash: hashVerificationCode(code),
      expires_at: expiresAt,
      metadata: {},
    } as never);

  if (error) {
    throw new Error('发送验证码失败');
  }

  await sendVerificationEmail(normalizedEmail, code);

  const shouldExposeDebugCode = process.env.NODE_ENV !== 'production' || process.env.PHONE_AUTH_DEBUG_CODE;
  return {
    expiresAt,
    debugCode: shouldExposeDebugCode ? code : undefined,
  };
}

export async function verifyEmailVerificationCode(
  email: string,
  purpose: EmailVerificationPurpose,
  code: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!validateEmail(normalizedEmail)) {
    throw new Error('请输入有效的邮箱地址');
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const verificationCode = data as EmailVerificationCodeRow | null;

  if (error || !verificationCode) {
    throw new Error('验证码无效或已过期');
  }

  const incomingHash = Buffer.from(hashVerificationCode(code), 'hex');
  const storedHash = Buffer.from(verificationCode.code_hash, 'hex');
  if (incomingHash.length !== storedHash.length || !timingSafeEqual(incomingHash, storedHash)) {
    throw new Error('验证码错误');
  }

  const { error: consumeError } = await supabase
    .from('email_verification_codes')
    .update({ consumed_at: now } as never)
    .eq('id', verificationCode.id);

  if (consumeError) {
    throw new Error('验证码校验失败');
  }
}
