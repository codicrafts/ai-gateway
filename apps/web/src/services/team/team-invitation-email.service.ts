import type { TeamInvitation } from '@ai-gateway/shared-types/team';
import { enqueueEmailNotification, markNotificationOutboxStatus } from '@/services/notification/notification-outbox.service';

type InvitationEmailContext = {
  invitation: TeamInvitation;
  inviterName?: string;
};

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function buildInvitationEmailHtml(context: InvitationEmailContext): string {
  const teamName = context.invitation.team_name || 'MeshRouter';
  const inviterName = context.inviterName || context.invitation.inviter?.username || 'A teammate';
  const inviteUrl = context.invitation.invite_url || '#';
  const roleLabel = context.invitation.role;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.6;">
      <h2 style="margin-bottom:12px;">You're invited to join ${teamName}</h2>
      <p style="margin:0 0 12px;">${inviterName} invited you to join <strong>${teamName}</strong> as <strong>${roleLabel}</strong>.</p>
      <p style="margin:0 0 20px;">Use the link below to review and respond to the invitation.</p>
      <p style="margin:0 0 20px;">
        <a href="${inviteUrl}" style="display:inline-block;background:#b8572b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">
          Review invitation
        </a>
      </p>
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Invitation link:</p>
      <p style="margin:0;color:#374151;font-size:14px;word-break:break-all;">${inviteUrl}</p>
    </div>
  `;
}

export async function sendTeamInvitationEmail(context: InvitationEmailContext): Promise<boolean> {
  if (!context.invitation.invite_url) {
    return false;
  }

  const subject = `Invitation to join ${context.invitation.team_name || 'MeshRouter'}`;
  const html = buildInvitationEmailHtml(context);
  const outboxRecord = await enqueueEmailNotification({
    recipient: context.invitation.email,
    subject,
    bodyHtml: html,
    metadata: {
      kind: 'team_invitation',
      invitation_id: context.invitation.id,
      team_id: context.invitation.team_id,
      invite_url: context.invitation.invite_url,
    },
  });

  if (!isResendConfigured()) {
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
      to: [context.invitation.email],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL || undefined,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    await markNotificationOutboxStatus(outboxRecord.id, {
      status: 'failed',
      provider: 'resend',
      error_message: errorText,
    });
    throw new Error(`发送邀请邮件失败: ${errorText}`);
  }

  await markNotificationOutboxStatus(outboxRecord.id, {
    status: 'sent',
    provider: 'resend',
    sent_at: new Date().toISOString(),
    metadata: {
      ...(outboxRecord.metadata || {}),
      kind: 'team_invitation',
      invitation_id: context.invitation.id,
      team_id: context.invitation.team_id,
      invite_url: context.invitation.invite_url,
    },
  });

  return true;
}
