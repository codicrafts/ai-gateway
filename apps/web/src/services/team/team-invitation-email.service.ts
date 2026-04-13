import type { TeamInvitation } from '@ai-gateway/shared-types/team';
import { TeamInvitationEmail } from '@/components/emails/TeamInvitationEmail';
import { isResendConfigured, sendResendEmail } from '@/lib/resend';
import { enqueueEmailNotification, markNotificationOutboxStatus } from '@/services/notification/notification-outbox.service';

type InvitationEmailContext = {
  invitation: TeamInvitation;
  inviterName?: string;
};

async function renderEmailToHtml(element: React.ReactElement): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  return renderToStaticMarkup(element);
}

export async function sendTeamInvitationEmail(context: InvitationEmailContext): Promise<boolean> {
  if (!context.invitation.invite_url) {
    return false;
  }

  const subject = `Invitation to join ${context.invitation.team_name || 'MeshRouter'}`;
  const reactTemplate = TeamInvitationEmail({
    invitation: context.invitation,
    inviterName: context.inviterName,
  });
  const outboxRecord = await enqueueEmailNotification({
    recipient: context.invitation.email,
    subject,
    bodyHtml: await renderEmailToHtml(reactTemplate),
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

  try {
    await sendResendEmail({
      to: context.invitation.email,
      subject,
      react: reactTemplate,
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '发送邀请邮件失败';
    await markNotificationOutboxStatus(outboxRecord.id, {
      status: 'failed',
      provider: 'resend',
      error_message: errorMessage,
    });
    throw new Error(`发送邀请邮件失败: ${errorMessage}`);
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
