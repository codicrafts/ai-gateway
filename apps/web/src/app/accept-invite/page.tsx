'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useMemo, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TeamInvitation } from '@ai-gateway/shared-types/team';
import { useAppSelector } from '@/store/hooks';

type InvitationResponse = {
  success: boolean;
  data?: TeamInvitation;
  error?: string;
};

function AcceptInvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAppSelector((state) => state.auth);
  const token = searchParams?.get('token') || '';
  const callbackUrl = useMemo(() => `/accept-invite?token=${token}`, [token]);

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentUserEmail = currentUser?.email?.toLowerCase() ?? null;
  const teamBrandColor = invitation?.team_brand_color || '#A94B2B';
  const teamBrandSoft = `${teamBrandColor}18`;

  useEffect(() => {
    if (!token) {
      setError('邀请链接无效');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadInvitation() {
      try {
        const response = await fetch(`/api/team-invitations/${token}`);
        const result: InvitationResponse = await response.json();

        if (!cancelled) {
          if (!response.ok || !result.success || !result.data) {
            setError(result.error || '邀请不存在或已失效');
            setInvitation(null);
          } else {
            setInvitation(result.data);
            setError(null);
          }
        }
      } catch {
        if (!cancelled) {
          setError('加载邀请失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvitation();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accountMismatch =
    Boolean(currentUserEmail) &&
    invitation &&
    currentUserEmail !== invitation.email.toLowerCase();

  async function respond(action: 'accept' | 'decline') {
    if (!token) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/team-invitations/${token}/${action}`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || (action === 'accept' ? '接受邀请失败' : '拒绝邀请失败'));
      }

      router.push('/dashboard?tab=team');
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <div className="editorial-panel w-full p-8 sm:p-10">
          <div className="eyebrow">Team Invitation</div>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">加入团队邀请</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
            通过这条链接接受或拒绝团队邀请。若你还没有账号，请先登录；首次手机号登录会自动创建账号。
          </p>

          {loading ? (
            <div className="mt-10 rounded-[24px] border border-border bg-white/60 px-6 py-12 text-center text-text-secondary">
              <i className="fas fa-spinner fa-spin mr-2" />
              正在加载邀请信息...
            </div>
          ) : error ? (
            <div className="mt-10 rounded-[24px] border border-danger/30 bg-danger/5 px-6 py-8">
              <div className="text-lg font-medium text-danger">{error}</div>
              <div className="mt-3 text-sm text-text-secondary">
                你可以返回登录页或联系团队管理员重新发送邀请。
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary">
                  前往登录
                </Link>
                <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-secondary">
                  去登录
                </Link>
              </div>
            </div>
          ) : invitation ? (
            <div className="mt-10 space-y-6">
              <div
                className="rounded-[24px] border border-border bg-white/70 p-5 sm:p-6"
                style={{ boxShadow: `0 18px 44px ${teamBrandColor}14` }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-border bg-white"
                    style={{ backgroundColor: teamBrandSoft }}
                  >
                    {invitation.team_logo ? (
                      <Image
                        src={invitation.team_logo}
                        alt={`${invitation.team_name || 'Team'} logo`}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold" style={{ color: teamBrandColor }}>
                        {(invitation.team_name || 'T').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">团队品牌</div>
                    <div className="mt-2 truncate text-xl font-semibold text-text-primary">
                      {invitation.team_name || '未命名团队'}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                      {invitation.team_slug ? (
                        <span className="rounded-full border border-border bg-white/80 px-3 py-1">
                          /{invitation.team_slug}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamBrandColor }} />
                        {teamBrandColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-border bg-white/70 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">团队</div>
                  <div className="mt-3 text-xl font-semibold">{invitation.team_name || '未命名团队'}</div>
                </div>
                <div className="rounded-[24px] border border-border bg-white/70 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">角色</div>
                  <div className="mt-3 text-xl font-semibold capitalize">{invitation.role}</div>
                </div>
                <div className="rounded-[24px] border border-border bg-white/70 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">过期时间</div>
                  <div className="mt-3 text-sm font-medium">{new Date(invitation.expires_at).toLocaleString('zh-CN')}</div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-white/70 p-6">
                <div className="text-sm text-text-secondary">受邀邮箱</div>
                <div className="mt-2 text-lg font-medium">{invitation.email}</div>

                {!currentUser ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary">
                      使用受邀邮箱登录
                    </Link>
                    <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-secondary">
                      去登录并接受
                    </Link>
                  </div>
                ) : accountMismatch ? (
                  <div className="mt-6 rounded-[20px] border border-warning/30 bg-warning/5 p-4 text-sm leading-7 text-text-secondary">
                    当前登录账号为 <span className="font-medium text-text-primary">{currentUser?.email}</span>，与邀请邮箱不一致。
                    请切换到 <span className="font-medium text-text-primary">{invitation.email}</span> 后再处理邀请。
                  </div>
                ) : invitation.status !== 'pending' ? (
                  <div className="mt-6 rounded-[20px] border border-border bg-white/60 p-4 text-sm leading-7 text-text-secondary">
                    该邀请当前状态为 <span className="font-medium text-text-primary capitalize">{invitation.status}</span>，无需重复处理。
                  </div>
                ) : (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void respond('accept')}
                      disabled={submitting}
                      className="btn-primary"
                    >
                      <i className="fas fa-check mr-2" />
                      接受邀请
                    </button>
                    <button
                      type="button"
                      onClick={() => void respond('decline')}
                      disabled={submitting}
                      className="btn-secondary"
                    >
                      <i className="fas fa-xmark mr-2" />
                      拒绝邀请
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AcceptInvitePageFallback() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <div className="editorial-panel w-full p-8 text-center text-text-secondary sm:p-10">
          <i className="fas fa-spinner fa-spin mr-2" />
          正在加载邀请页面...
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInvitePageFallback />}>
      <AcceptInvitePageContent />
    </Suspense>
  );
}
