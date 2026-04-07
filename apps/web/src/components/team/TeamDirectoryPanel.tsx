'use client';

import type { TeamDetail, TeamListItem, TeamRole } from '@ai-gateway/shared-types/team';
import { useAppSelector } from '@/store/hooks';

interface TeamDirectoryPanelProps {
  teams: TeamListItem[];
  currentTeam: TeamDetail | null;
  currentUserRole: TeamRole;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
}

export default function TeamDirectoryPanel({
  teams,
  currentTeam,
  currentUserRole,
  onSelectTeam,
  onCreateTeam,
}: TeamDirectoryPanelProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';
  const tr = (zh: string, en: string) => (isZh ? zh : en);

  return (
    <div className="editorial-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="eyebrow">{tr('团队目录', 'Team Directory')}</div>
          <h3 className="mt-3 text-xl font-semibold">{tr('切换工作区', 'Switch Workspace')}</h3>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {tr('集中查看你所属的团队，并切换到不同团队的控制台上下文。', 'Browse the teams you belong to and switch the control plane context directly.')}
          </p>
        </div>
        <button type="button" onClick={onCreateTeam} className="btn-primary px-5 py-2.5 text-sm">
          <i className="fas fa-plus mr-2" />
          {tr('创建团队', 'Create Team')}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {teams.map((team) => {
          const isCurrent = currentTeam?.id === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team.id)}
              className={`rounded-[22px] border p-4 text-left transition-all ${
                isCurrent
                  ? 'border-primary bg-[rgba(169,75,43,0.08)] shadow-soft'
                  : 'border-border bg-white/72 hover:-translate-y-0.5 hover:shadow-soft'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-[16px] text-lg font-semibold"
                      style={{ backgroundColor: `${team.brand_color || '#A94B2B'}18`, color: team.brand_color || '#A94B2B' }}
                    >
                      {(team.name || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{team.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
                        {team.slug || team.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  {team.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{team.description}</p>
                  )}
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                    {tr('当前', 'Current')}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-text-secondary">
                  {team.member_count} {tr('成员', 'members')}
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-text-secondary">
                  {team.user_role === 'owner'
                    ? 'Owner'
                    : team.user_role === 'admin'
                      ? 'Admin'
                      : team.user_role === 'member'
                        ? 'Member'
                        : 'Guest'}
                </span>
                {team.website && (
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-text-secondary">
                    {tr('已配置站点', 'Site configured')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {teams.length === 1 && currentTeam && (
        <div className="mt-4 rounded-[18px] border border-dashed border-border bg-white/45 p-4 text-sm leading-7 text-text-secondary">
          {currentUserRole === 'owner' || currentUserRole === 'admin'
            ? tr('你当前只有一个团队，可继续创建新团队以区分测试、生产或不同业务线。', 'You currently have one team. Create more teams to separate staging, production, or business units.')
            : tr('当前账号只加入了一个团队。若需要更多工作区，可联系团队所有者或管理员创建。', 'This account currently belongs to one team. Ask an owner or admin to create more workspaces if needed.')}
        </div>
      )}
    </div>
  );
}
