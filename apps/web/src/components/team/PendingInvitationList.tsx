'use client';

import type { TeamInvitation } from '@ai-gateway/shared-types/team';
import { useAppSelector } from '@/store/hooks';

interface PendingInvitationListProps {
  invitations: TeamInvitation[];
  loading?: boolean;
  onCopyLink?: (inviteUrl: string) => void;
  onCancel?: (invitationId: string, email: string) => void;
}

export default function PendingInvitationList({
  invitations,
  loading = false,
  onCopyLink,
  onCancel,
}: PendingInvitationListProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';

  return (
    <div className="editorial-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">{isZh ? '邀请队列' : 'Invitation Queue'}</div>
          <h3 className="mt-3 text-xl font-semibold">{isZh ? '待处理邀请' : 'Pending Invitations'}</h3>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {isZh
              ? '查看尚未接受的邀请，并管理邀请链接。'
              : 'Review outstanding invitations and manage invite links.'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-white/70 px-3 py-2 text-sm text-text-secondary sm:self-auto">
          <span className="whitespace-nowrap">{isZh ? '待处理' : 'Open'}</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/12 px-2 text-xs font-semibold text-primary">
            {invitations.length}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-[22px] border border-dashed border-border bg-white/45 py-10 text-center text-text-secondary">
            <i className="fas fa-spinner fa-spin text-3xl mb-2 opacity-60" />
            <p>{isZh ? '正在读取邀请列表...' : 'Loading invitations...'}</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border bg-white/45 py-10 text-center text-text-secondary">
            <i className="fas fa-envelope-open text-3xl mb-2 opacity-50" />
            <p>{isZh ? '当前没有待处理邀请' : 'No pending invitations right now'}</p>
          </div>
        ) : (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="rounded-[22px] border border-border bg-white/72 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-all">{invitation.email}</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary capitalize">
                      {invitation.role}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-text-secondary">
                    {isZh ? '过期于 ' : 'Expires at '}
                    {new Date(invitation.expires_at).toLocaleString(isZh ? 'zh-CN' : 'en-US')}
                  </div>
                  {invitation.inviter && (
                    <div className="mt-1 text-xs text-text-secondary">
                      {isZh ? '邀请人：' : 'Invited by: '}
                      {invitation.inviter.username}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {invitation.invite_url && onCopyLink && (
                    <button
                      type="button"
                      onClick={() => onCopyLink(invitation.invite_url!)}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      <i className="fas fa-link mr-2" />
                      {isZh ? '复制邀请链接' : 'Copy Invite Link'}
                    </button>
                  )}
                  {onCancel && (
                    <button
                      type="button"
                      onClick={() => onCancel(invitation.id, invitation.email)}
                      className="btn-secondary border-danger/40 text-danger hover:bg-danger/10 text-sm py-2 px-4"
                    >
                      <i className="fas fa-ban mr-2" />
                      {isZh ? '取消邀请' : 'Cancel Invite'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
