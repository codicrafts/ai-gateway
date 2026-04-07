import type { ContactLeadRecord } from '@/services/contact/contact-lead.service';

function isContactNotificationConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      (process.env.CONTACT_LEADS_NOTIFY_EMAIL || process.env.CONTACT_EMAIL)
  );
}

function buildContactLeadEmailHtml(lead: ContactLeadRecord): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.6;">
      <h2 style="margin-bottom:12px;">New website contact lead</h2>
      <p style="margin:0 0 8px;"><strong>Name:</strong> ${lead.name}</p>
      <p style="margin:0 0 8px;"><strong>Email:</strong> ${lead.email}</p>
      <p style="margin:0 0 8px;"><strong>Company:</strong> ${lead.company || '-'}</p>
      <p style="margin:0 0 8px;"><strong>Inquiry type:</strong> ${lead.inquiry_type}</p>
      <p style="margin:0 0 8px;"><strong>Locale:</strong> ${lead.locale || '-'}</p>
      <p style="margin:0 0 8px;"><strong>Lead ID:</strong> ${lead.id}</p>
      <p style="margin:16px 0 8px;"><strong>Message</strong></p>
      <div style="padding:12px 14px;border:1px solid #e5d2c4;border-radius:12px;background:#fff8f0;white-space:pre-wrap;">${lead.message}</div>
    </div>
  `;
}

export async function sendContactLeadNotification(lead: ContactLeadRecord): Promise<boolean> {
  if (!isContactNotificationConfigured()) {
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [process.env.CONTACT_LEADS_NOTIFY_EMAIL || process.env.CONTACT_EMAIL],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL || lead.email,
      subject: `[Website Lead] ${lead.inquiry_type} · ${lead.name}`,
      html: buildContactLeadEmailHtml(lead),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`发送联系线索通知失败: ${errorText}`);
  }

  return true;
}
