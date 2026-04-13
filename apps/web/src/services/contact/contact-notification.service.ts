import { ContactLeadEmail } from '@/components/emails/ContactLeadEmail';
import type { ContactLeadRecord } from '@/services/contact/contact-lead.service';
import { isResendConfigured, sendResendEmail } from '@/lib/resend';

function isContactNotificationConfigured(): boolean {
  return Boolean(
    isResendConfigured() && (process.env.CONTACT_LEADS_NOTIFY_EMAIL || process.env.CONTACT_EMAIL)
  );
}

export async function sendContactLeadNotification(lead: ContactLeadRecord): Promise<boolean> {
  if (!isContactNotificationConfigured()) {
    return false;
  }

  try {
    await sendResendEmail({
      to: process.env.CONTACT_LEADS_NOTIFY_EMAIL || process.env.CONTACT_EMAIL || '',
      subject: `[Website Lead] ${lead.inquiry_type} · ${lead.name}`,
      react: ContactLeadEmail({ lead }),
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || lead.email,
    });
  } catch (error) {
    throw new Error(error instanceof Error ? `发送联系线索通知失败: ${error.message}` : '发送联系线索通知失败');
  }

  return true;
}
