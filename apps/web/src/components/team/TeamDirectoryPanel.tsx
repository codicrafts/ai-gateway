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
    <div className="editorial-panel p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="eyebrow">{tr('团队目录', 'Team Directory')}</div>
          <h3 className="mt-2 sm:mt-3 text-base sm:text-lg md:text-xl font-semibold">{tr('切换团队', 'Switch Team')}</h3>
          <p className="mt-1.5 sm:mt-2 text-[0.7rem] sm:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
            {tr('查看你加入的团队，并在它们之间快速切换。', 'View the teams you belong to and switch between them quickly.')}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateTeam}
          className="btn-primary inline-flex w-full sm:w-auto self-start px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm justify-center md:self-auto"
        >
          <i className="fas fa-plus mr-1.5 sm:mr-2" />
          {tr('创建团队', 'Create Team')}
        </button>
      </div>

      <div className="mt-3 sm:mt-4 md:mt-5 grid gap-2.5 sm:gap-3 lg:grid-cols-2">
        {teams.map((team) => {
          const isCurrent = currentTeam?.id === team.id;
          const tone = team.brand_color || '#A94B2B';
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team.id)}
              className={`rounded-md sm:rounded-lg md:rounded-xl border p-3 sm:p-4 text-left transition-all ${
                isCurrent
                  ? 'shadow-soft'
                  : 'border-border bg-white/72 hover:-translate-y-0.5 hover:shadow-soft'
              }`}
              style={
                isCurrent
                  ? {
                      borderColor: `${tone}5e`,
                      backgroundColor: `${tone}0d`,
                      boxShadow: `0 18px 40px ${tone}14`,
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-lg sm:rounded-xl text-base sm:text-lg font-semibold"
                      style={{ backgroundColor: `${tone}18`, color: tone }}
                    >
                      {(team.name || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold">{team.name}</div>
                      <div className="mt-0.5 sm:mt-1 text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                        {team.slug || team.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  {team.description && (
                    <p className="mt-2 sm:mt-3 line-clamp-2 text-xs sm:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">{team.description}</p>
                  )}
                </div>
                {isCurrent && (
                  <span
                    className="rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: tone }}
                  >
                    {tr('当前', 'Current')}
                  </span>
                )}
              </div>

              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                <span className="rounded-full bg-white/80 px-2 py-0.5 sm:px-3 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-text-secondary">
                  {team.member_count} {tr('成员', 'members')}
                </span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 sm:px-3 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-text-secondary">
                  {team.user_role === 'owner'
                    ? 'Owner'
                    : team.user_role === 'admin'
                      ? 'Admin'
                      : team.user_role === 'member'
                        ? 'Member'
                        : 'Guest'}
                </span>
                {team.website && (
                  <span className="rounded-full bg-white/80 px-2 py-0.5 sm:px-3 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-text-secondary">
                    {tr('已配置站点', 'Site configured')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {teams.length === 1 && currentTeam && (
        <div className="mt-3 sm:mt-4 rounded-md sm:rounded-lg md:rounded-xl border border-dashed border-border bg-white/45 p-3 sm:p-4 text-xs sm:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
          {currentUserRole === 'owner' || currentUserRole === 'admin'
            ? tr('你当前只有一个团队。如有需要，可以继续创建新的团队来区分不同项目。', 'You currently have one team. Create another one if you want to separate different projects.')
            : tr('当前账号只加入了一个团队。如需更多团队，可联系所有者或管理员。', 'This account currently belongs to one team. Contact an owner or admin if you need another team.')}
        </div>
      )}
    </div>
  );
}
