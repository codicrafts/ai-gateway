import { BaseEmailLayout } from '@/components/emails/BaseEmailLayout';
import { EmailButton } from '@/components/emails/EmailButton';
import type { TeamInvitation } from '@ai-gateway/shared-types/team';

type TeamInvitationEmailProps = {
  invitation: TeamInvitation;
  inviterName?: string;
};

export function TeamInvitationEmail({ invitation, inviterName }: TeamInvitationEmailProps) {
  const teamName = invitation.team_name || 'MeshRouter';
  const resolvedInviterName = inviterName || invitation.inviter?.username || 'A teammate';
  const inviteUrl = invitation.invite_url || '#';
  const roleLabel = invitation.role;

  return (
    <BaseEmailLayout
      title={`You're invited to join ${teamName}`}
      preview={`${resolvedInviterName} invited you to join ${teamName}`}
    >
      <p style={{ margin: '0 0 12px' }}>
        {resolvedInviterName} invited you to join <strong>{teamName}</strong> as <strong>{roleLabel}</strong>.
      </p>
      <p style={{ margin: '0 0 20px' }}>Use the link below to review and respond to the invitation.</p>
      <p style={{ margin: '0 0 20px' }}>
        <EmailButton href={inviteUrl}>Review invitation</EmailButton>
      </p>
      <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '14px' }}>Invitation link:</p>
      <p style={{ margin: 0, color: '#374151', fontSize: '14px', wordBreak: 'break-all' }}>{inviteUrl}</p>
    </BaseEmailLayout>
  );
}
