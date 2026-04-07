import { createHash, timingSafeEqual } from 'crypto';
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

function canSendEmailCode(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function sendVerificationEmail(email: string, code: string): Promise<void> {
  if (!canSendEmailCode()) {
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: '你的登录验证码',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#1f2937;">
          <h2 style="margin-bottom:12px;">登录验证码</h2>
          <p>你正在使用邮箱验证码登录 MeshRouter。</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0;">${code}</p>
          <p>验证码 10 分钟内有效。</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error('发送验证码失败');
  }
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
