'use client';

import { useMemo, useState } from 'react';
import type { TeamJoinApplication, TeamRole } from '@ai-gateway/shared-types/team';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppSelector } from '@/store/hooks';
import { formatDate } from '@/utils/helpers';

interface JoinApplicationsPanelProps {
  teamSlug?: string | null;
  canManageTeam: boolean;
  applications: TeamJoinApplication[];
  myApplications: TeamJoinApplication[];
  onApply: (payload: { slug: string; requestedRole: Extract<TeamRole, 'member' | 'guest'>; message?: string }) => Promise<void> | void;
  onReview: (applicationId: string, decision: 'approve' | 'reject') => Promise<void> | void;
}

export default function JoinApplicationsPanel({
  teamSlug,
  canManageTeam,
  applications,
  myApplications,
  onApply,
  onReview,
}: JoinApplicationsPanelProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';
  const tr = (zh: string, en: string) => (isZh ? zh : en);
  const [slug, setSlug] = useState(teamSlug || '');
  const [requestedRole, setRequestedRole] = useState<Extract<TeamRole, 'member' | 'guest'>>('member');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const myPendingApplications = useMemo(
    () => myApplications.slice(0, 5),
    [myApplications]
  );

  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await onApply({
        slug: slug.trim(),
        requestedRole,
        message: message.trim() || undefined,
      });
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (applicationId: string, decision: 'approve' | 'reject') => {
    try {
      setReviewingId(applicationId);
      await onReview(applicationId, decision);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="editorial-panel p-5 sm:p-6">
        <div className="eyebrow">{tr('加入团队', 'Join Team')}</div>
        <h3 className="mt-3 text-xl font-semibold">{tr('通过团队标识提交加入申请', 'Apply to join a team by slug')}</h3>
        <p className="mt-2 text-sm leading-7 text-text-secondary">
          {tr('输入团队 slug，说明你的使用场景，团队管理员会在当前工作区审批。', 'Enter the team slug and your use case. Team admins can review the request in this workspace.')}
        </p>

        <form onSubmit={handleApply} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label className="mb-2 block text-sm text-text-secondary">{tr('团队 slug', 'Team Slug')}</label>
              <input
                type="text"
                className="form-control"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={tr('例如：acme-platform', 'e.g. acme-platform')}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-text-secondary">{tr('申请角色', 'Requested Role')}</label>
              <EditorialSelect
                value={requestedRole}
                onChange={(value) => setRequestedRole((value as Extract<TeamRole, 'member' | 'guest'>) || 'member')}
                options={[
                  { value: 'member', label: tr('成员', 'Member') },
                  { value: 'guest', label: tr('访客', 'Guest') },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">{tr('补充说明', 'Message')}</label>
            <textarea
              className="form-control min-h-[108px]"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={tr('说明你的团队归属、使用目的或交付背景。', 'Describe your team context, intended use, or delivery background.')}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!slug.trim() || submitting} className="btn-primary px-5 py-2.5 disabled:opacity-50">
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'} mr-2`} />
              {tr('提交申请', 'Submit Application')}
            </button>
          </div>
        </form>
      </div>

      {myPendingApplications.length > 0 && (
        <div className="editorial-panel p-5 sm:p-6">
          <div className="eyebrow">{tr('我的申请', 'My Applications')}</div>
          <h3 className="mt-3 text-xl font-semibold">{tr('最近申请记录', 'Recent Requests')}</h3>
          <div className="mt-5 space-y-3">
            {myPendingApplications.map((item) => (
              <div key={item.id} className="rounded-[20px] border border-border bg-white/72 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">{item.team_name || item.team_slug || '—'}</div>
                    <div className="mt-1 text-sm text-text-secondary">
                      {tr('申请角色：', 'Requested role: ')}
                      {item.requested_role === 'member' ? tr('成员', 'Member') : tr('访客', 'Guest')}
                    </div>
                    {item.message && <div className="mt-2 text-sm leading-7 text-text-secondary">{item.message}</div>}
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'pending' ? 'bg-warning/18 text-warning' : item.status === 'approved' ? 'bg-success/18 text-success' : 'bg-danger/14 text-danger'}`}>
                      {item.status === 'pending'
                        ? tr('待处理', 'Pending')
                        : item.status === 'approved'
                          ? tr('已批准', 'Approved')
                          : tr('已拒绝', 'Rejected')}
                    </span>
                    <div className="text-xs text-text-secondary">{formatDate(item.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManageTeam && (
        <div className="editorial-panel p-5 sm:p-6">
          <div className="eyebrow">{tr('审批队列', 'Review Queue')}</div>
          <h3 className="mt-3 text-xl font-semibold">{tr('待审批加入申请', 'Pending Join Requests')}</h3>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {tr('这里会显示申请加入当前团队的请求，可直接批准为成员或访客。', 'Requests to join the current team appear here and can be approved as member or guest.')}
          </p>
          <div className="mt-5 space-y-3">
            {applications.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border bg-white/50 p-6 text-center text-sm text-text-secondary">
                {tr('当前没有待审批申请', 'There are no pending requests')}
              </div>
            ) : (
              applications.map((item) => (
                <div key={item.id} className="rounded-[20px] border border-border bg-white/72 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {item.applicant?.username || item.applicant?.email || '—'}
                      </div>
                      <div className="mt-1 text-sm text-text-secondary">
                        {tr('申请角色：', 'Requested role: ')}
                        {item.requested_role === 'member' ? tr('成员', 'Member') : tr('访客', 'Guest')}
                      </div>
                      {item.message && (
                        <div className="mt-2 text-sm leading-7 text-text-secondary">
                          {item.message}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReview(item.id, 'approve')}
                        disabled={reviewingId === item.id}
                        className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                      >
                        <i className={`fas ${reviewingId === item.id ? 'fa-spinner fa-spin' : 'fa-check'} mr-2`} />
                        {tr('批准', 'Approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(item.id, 'reject')}
                        disabled={reviewingId === item.id}
                        className="btn-secondary border-danger/40 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
                      >
                        <i className="fas fa-ban mr-2" />
                        {tr('拒绝', 'Reject')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
