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

export function isAccountEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function sendAccountEmail(payload: { to: string; subject: string; html: string }): Promise<void> {
  if (!isAccountEmailConfigured()) {
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
      to: [payload.to],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL || undefined,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`发送邮件失败: ${errorText}`);
  }
}

async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await sendAccountEmail({
    to: email,
    subject: '你的登录验证码',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#1f2937;">
        <h2 style="margin-bottom:12px;">登录验证码</h2>
        <p>你正在使用邮箱验证码登录 MeshRouter。</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0;">${code}</p>
        <p>验证码 10 分钟内有效。</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, expiresAt?: string): Promise<void> {
  const expiryText = expiresAt
    ? `该链接将在 ${new Date(expiresAt).toLocaleString('zh-CN', { hour12: false })} 前有效。`
    : '该链接将在 1 小时内有效。';

  await sendAccountEmail({
    to: email,
    subject: '重置你的 MeshRouter 密码',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#1f2937;">
        <h2 style="margin-bottom:12px;">重置你的密码</h2>
        <p style="margin:0 0 12px;">我们收到了你的密码重置请求。如果这是你本人操作，请点击下面的按钮继续。</p>
        <p style="margin:20px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#b8572b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">
            打开重置页面
          </a>
        </p>
        <p style="margin:0 0 12px;">${expiryText}</p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">如果按钮无法打开，请使用下面的链接：</p>
        <p style="margin:0;color:#374151;font-size:14px;word-break:break-all;">${resetUrl}</p>
      </div>
    `,
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
