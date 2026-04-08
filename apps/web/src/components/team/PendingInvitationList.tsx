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
    <div className="editorial-panel p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-2.5 sm:gap-3 border-b border-border pb-3 sm:pb-4 md:pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">{isZh ? '邀请队列' : 'Invitation Queue'}</div>
          <h3 className="mt-2 sm:mt-3 text-base sm:text-lg md:text-xl font-semibold">{isZh ? '待处理邀请' : 'Pending Invitations'}</h3>
          <p className="mt-1.5 sm:mt-2 text-[0.7rem] sm:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
            {isZh
              ? '查看尚未接受的邀请，并管理邀请链接。'
              : 'Review outstanding invitations and manage invite links.'}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 sm:gap-2 self-start rounded-full border border-border bg-white/70 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-text-secondary sm:self-auto">
          <span className="whitespace-nowrap">{isZh ? '待处理' : 'Open'}</span>
          <span className="flex h-5 min-w-5 sm:h-6 sm:min-w-6 items-center justify-center rounded-full bg-primary/12 px-1.5 sm:px-2 text-[0.65rem] sm:text-xs font-semibold text-primary">
            {invitations.length}
          </span>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 md:mt-5 space-y-2.5 sm:space-y-3">
        {loading ? (
          <div className="rounded-md sm:rounded-lg md:rounded-xl border border-dashed border-border bg-white/45 py-8 sm:py-10 text-center text-text-secondary">
            <i className="fas fa-spinner fa-spin text-2xl sm:text-3xl mb-1.5 sm:mb-2 opacity-60" />
            <p className="text-xs sm:text-sm">{isZh ? '正在读取邀请列表...' : 'Loading invitations...'}</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-md sm:rounded-lg md:rounded-xl border border-dashed border-border bg-white/45 py-8 sm:py-10 text-center text-text-secondary">
            <i className="fas fa-envelope-open text-2xl sm:text-3xl mb-1.5 sm:mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">{isZh ? '当前没有待处理邀请' : 'No pending invitations right now'}</p>
          </div>
        ) : (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="rounded-md sm:rounded-lg md:rounded-xl border border-border bg-white/72 p-3 sm:p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-medium break-all text-sm sm:text-base">{invitation.email}</span>
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 sm:px-2 text-[0.65rem] sm:text-xs text-primary capitalize">
                      {invitation.role}
                    </span>
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-[0.7rem] sm:text-sm text-text-secondary">
                    {isZh ? '过期于 ' : 'Expires at '}
                    {new Date(invitation.expires_at).toLocaleString(isZh ? 'zh-CN' : 'en-US')}
                  </div>
                  {invitation.inviter && (
                    <div className="mt-0.5 sm:mt-1 text-[0.65rem] sm:text-xs text-text-secondary">
                      {isZh ? '邀请人：' : 'Invited by: '}
                      {invitation.inviter.username}
                    </div>
                  )}
                </div>

                <div className="flex w-full flex-col gap-1.5 sm:gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                  {invitation.invite_url && onCopyLink && (
                    <button
                      type="button"
                      onClick={() => onCopyLink(invitation.invite_url!)}
                      className="btn-secondary w-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm sm:w-auto justify-center"
                    >
                      <i className="fas fa-link mr-1.5 sm:mr-2" />
                      {isZh ? '复制邀请链接' : 'Copy Invite Link'}
                    </button>
                  )}
                  {onCancel && (
                    <button
                      type="button"
                      onClick={() => onCancel(invitation.id, invitation.email)}
                      className="btn-secondary w-full border-danger/40 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-danger hover:bg-danger/10 sm:w-auto justify-center"
                    >
                      <i className="fas fa-ban mr-1.5 sm:mr-2" />
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
