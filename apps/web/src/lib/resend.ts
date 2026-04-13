import type { ReactElement } from 'react';
import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY 未配置');
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

type SendResendEmailParams = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

export async function sendResendEmail(params: SendResendEmailParams): Promise<void> {
  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL 未配置');
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    react: params.react,
    replyTo: params.replyTo,
  });

  if (error) {
    throw new Error(`发送邮件失败: ${error.message}`);
  }
}
