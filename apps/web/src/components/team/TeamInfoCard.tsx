'use client';

import Image from 'next/image';
import { TeamDetail, TeamRole } from '@ai-gateway/shared-types/team';
import { useAppSelector } from '@/store/hooks';

interface TeamInfoCardProps {
  team: TeamDetail;
  userRole: TeamRole;
  onEdit?: () => void;
}

/**
 * 团队信息卡片组件
 * 显示团队名称、描述、Logo、成员数量
 * 根据用户角色显示编辑按钮（仅 Owner 和 Admin 可见）
 * 
 * 需求: 15.2
 */
export default function TeamInfoCard({ team, userRole, onEdit }: TeamInfoCardProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const copy = locale === 'zh'
    ? {
        editTitle: '编辑团队信息',
        edit: '编辑',
        members: '成员',
        myRole: '我的角色',
        teamIdentity: '团队信息',
        collaboration: '团队状态',
        ready: '正常',
        currentOwner: '团队所有者',
        creator: '创建人',
        slug: '团队 slug',
        website: '团队网站',
        brandColor: '品牌主色',
        noWebsite: '未设置',
      }
    : {
        editTitle: 'Edit Team',
        edit: 'Edit',
        members: 'Members',
        myRole: 'My Role',
        teamIdentity: 'Team Info',
        collaboration: 'Status',
        ready: 'Active',
        currentOwner: 'Team Owner',
        creator: 'Created by',
        slug: 'Team slug',
        website: 'Website',
        brandColor: 'Brand color',
        noWebsite: 'Not set',
      };
  // 只有 Owner 或 Admin 可以编辑团队信息
  const canEdit = userRole === 'owner' || userRole === 'admin';

  // 获取 Logo 显示内容（如果有 Logo URL 则显示图片，否则显示首字母）
  const renderLogo = () => {
    if (team.logo) {
      return (
        <Image
          src={team.logo}
          alt={`${team.name} Logo`}
          width={64}
          height={64}
          unoptimized
          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover"
        />
      );
    }
    // 默认显示团队名称首字母
    const initial = team.name.charAt(0).toUpperCase();
    return (
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-primary/20 text-lg sm:text-xl md:text-2xl font-bold text-primary">
        {initial}
      </div>
    );
  };

  return (
    <div className="editorial-panel overflow-hidden">
      <div className="border-b border-border bg-[linear-gradient(135deg,rgba(169,75,43,0.12),rgba(255,248,238,0.78)_52%,rgba(33,93,89,0.08))] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              {renderLogo()}
            </div>
            <div className="min-w-0">
              <div className="text-[0.6rem] sm:text-[11px] uppercase tracking-[0.20em] sm:tracking-[0.24em] text-text-secondary">{copy.teamIdentity}</div>
              <h2 className="mt-1.5 sm:mt-2 break-all text-base sm:text-lg md:text-xl lg:text-[2rem] font-semibold sm:truncate">{team.name}</h2>
              <p className="mt-1.5 sm:mt-2 max-w-2xl text-[0.7rem] sm:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
                {team.description || copy.ready}
              </p>
            </div>
          </div>

          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="btn-secondary text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-4 flex-shrink-0 self-start w-full sm:w-auto justify-center"
              title={copy.editTitle}
            >
              <i className="fas fa-edit mr-1.5 sm:mr-2" />
              {copy.edit}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2.5 sm:gap-3 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-md sm:rounded-lg md:rounded-xl border border-border bg-white/70 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-primary/12 text-primary">
              <i className="fas fa-users text-xs sm:text-sm" />
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-2xl font-semibold">{team.member_count}</div>
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.members}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md sm:rounded-lg md:rounded-xl border border-border bg-white/70 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`flex h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-lg sm:rounded-xl ${getRoleBgColor(userRole)}`}>
              <i className={`fas ${getRoleIcon(userRole)} text-xs sm:text-sm`} />
            </div>
            <div>
              <div className="text-base sm:text-lg md:text-xl font-semibold text-text-primary">{getRoleLabel(userRole, locale)}</div>
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.myRole}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md sm:rounded-lg md:rounded-xl border border-border bg-white/70 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-[rgba(33,93,89,0.12)] text-[var(--page-accent-deep)]">
              <i className="fas fa-diagram-project text-xs sm:text-sm" />
            </div>
            <div>
              <div className="text-base sm:text-lg md:text-xl font-semibold text-text-primary">{copy.ready}</div>
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.collaboration}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md sm:rounded-lg md:rounded-xl border border-border bg-white/70 px-3 py-3 sm:px-4 sm:py-4">
          <div className="space-y-2 sm:space-y-3">
            <div>
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.currentOwner}</div>
              <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-text-primary truncate">
                {team.owner_user?.username || team.owner_user?.email || '—'}
              </div>
            </div>
            <div className="border-t border-border pt-2 sm:pt-3">
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.creator}</div>
              <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-text-primary truncate">
                {team.created_by_user?.username || team.created_by_user?.email || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md sm:rounded-lg md:rounded-xl border border-border bg-white/70 px-3 py-3 sm:px-4 sm:py-4">
          <div className="space-y-2 sm:space-y-3">
            <div>
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.slug}</div>
              <div className="mt-0.5 sm:mt-1 truncate text-xs sm:text-sm font-medium text-text-primary">{team.slug || '—'}</div>
            </div>
            <div className="border-t border-border pt-2 sm:pt-3">
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.website}</div>
              {team.website ? (
                <a href={team.website} target="_blank" rel="noreferrer" className="mt-0.5 sm:mt-1 block truncate text-xs sm:text-sm font-medium text-primary hover:underline">
                  {team.website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-text-secondary">{copy.noWebsite}</div>
              )}
            </div>
            <div className="border-t border-border pt-2 sm:pt-3">
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{copy.brandColor}</div>
              <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-text-primary">
                <span
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border border-border"
                  style={{ backgroundColor: team.brand_color || '#A94B2B' }}
                />
                {team.brand_color || '#A94B2B'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 获取角色对应的背景颜色类名
 */
function getRoleBgColor(role: TeamRole): string {
  const colors: Record<TeamRole, string> = {
    owner: 'bg-primary/20 text-primary',
    admin: 'bg-warning/20 text-warning',
    member: 'bg-success/20 text-success',
    guest: 'bg-secondary/20 text-secondary',
  };
  return colors[role];
}

/**
 * 获取角色对应的图标类名
 */
function getRoleIcon(role: TeamRole): string {
  const icons: Record<TeamRole, string> = {
    owner: 'fa-crown',
    admin: 'fa-user-shield',
    member: 'fa-user',
    guest: 'fa-user-clock',
  };
  return icons[role];
}

/**
 * 获取角色的中文标签
 */
function getRoleLabel(role: TeamRole, locale: 'zh' | 'en'): string {
  const labels: Record<TeamRole, string> = {
    owner: locale === 'zh' ? 'Owner' : 'Owner',
    admin: locale === 'zh' ? 'Admin' : 'Admin',
    member: locale === 'zh' ? 'Member' : 'Member',
    guest: locale === 'zh' ? 'Guest' : 'Guest',
  };
  return labels[role];
}
