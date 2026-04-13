import { Resend } from 'resend';
import { AccountVerificationEmail } from '@/components/emails/AccountVerificationEmail';
import { PasswordResetEmail } from '@/components/emails/PasswordResetEmail';
import { EmailTemplate } from '@/components/email-template';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  if (!resendClient) {
    throw new Error('RESEND_API_KEY 未配置');
  }
  return resendClient;
}

type DemoTemplate = 'welcome' | 'verification' | 'password-reset';

type SendEmailPayload = {
  to?: string;
  subject?: string;
  firstName?: string;
  template?: DemoTemplate;
  code?: string;
  resetUrl?: string;
  expiresAt?: string;
};

function getAppBaseUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin;
}

function buildTemplate(body: SendEmailPayload, request: Request) {
  const template = body.template || 'welcome';

  switch (template) {
    case 'verification':
      return {
        subject: body.subject || '你的登录验证码',
        react: AccountVerificationEmail({ code: body.code || '123456' }),
      };
    case 'password-reset': {
      const resetUrl = body.resetUrl || `${getAppBaseUrl(request)}/reset-password?token=demo-token`;
      const expiryText = body.expiresAt
        ? `该链接将在 ${new Date(body.expiresAt).toLocaleString('zh-CN', { hour12: false })} 前有效。`
        : '该链接将在 1 小时内有效。';

      return {
        subject: body.subject || '重置你的 MeshRouter 密码',
        react: PasswordResetEmail({ resetUrl, expiryText }),
      };
    }
    case 'welcome':
    default:
      return {
        subject: body.subject || 'Hello world',
        react: EmailTemplate({ firstName: body.firstName || 'John' }),
      };
  }
}

export async function GET() {
  return Response.json({
    templates: [
      {
        key: 'welcome',
        fields: ['to', 'firstName?', 'subject?'],
      },
      {
        key: 'verification',
        fields: ['to', 'code?', 'subject?'],
      },
      {
        key: 'password-reset',
        fields: ['to', 'resetUrl?', 'expiresAt?', 'subject?'],
      },
    ],
  });
}

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY 未配置' }, { status: 500 });
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      return Response.json({ error: 'RESEND_FROM_EMAIL 未配置' }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as SendEmailPayload;
    if (!body.to) {
      return Response.json({ error: '缺少收件人邮箱 to' }, { status: 400 });
    }

    const emailPayload = buildTemplate(body, request);
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [body.to],
      subject: emailPayload.subject,
      react: emailPayload.react,
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || undefined,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '发送测试邮件失败' },
      { status: 500 },
    );
  }
}
