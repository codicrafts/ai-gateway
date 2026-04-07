'use client';

import { TeamMember, TeamRole } from '@ai-gateway/shared-types/team';
import EditorialSelect, { EditorialSelectOption } from '@/components/ui/EditorialSelect';
import { useAppSelector } from '@/store/hooks';

interface MemberListProps {
  /** 成员列表 */
  members: TeamMember[];
  /** 当前用户角色 */
  currentUserRole: TeamRole;
  /** 当前用户 ID */
  currentUserId: string;
  /** 角色变更回调 */
  onRoleChange?: (userId: string, newRole: TeamRole) => void;
  /** 移除成员回调 */
  onRemove?: (userId: string) => void;
  /** 邀请成员回调 */
  onInvite?: () => void;
  /** 搜索关键词 */
  searchQuery: string;
  /** 搜索变更回调 */
  onSearchChange: (query: string) => void;
  /** 角色筛选 */
  roleFilter: TeamRole | null;
  /** 角色筛选变更回调 */
  onRoleFilterChange: (role: TeamRole | null) => void;
}

/**
 * 成员列表组件
 * 显示成员头像、名称、邮箱、角色、加入时间
 * 支持搜索和角色筛选
 * 根据用户角色显示管理操作按钮
 * 
 * 需求: 15.3, 15.4
 */
export default function MemberList({
  members,
  currentUserRole,
  currentUserId,
  onRoleChange,
  onRemove,
  onInvite,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: MemberListProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const text = locale === 'zh'
    ? {
        title: '团队成员',
        invite: '邀请成员',
        searchPlaceholder: '搜索用户名或邮箱...',
        allRoles: '全部角色',
        noMatches: '没有找到匹配的成员',
        totalMembers: '共',
        membersUnit: '名成员',
        showing: '显示',
        unknownUser: '未知用户',
        me: '我',
        noEmail: '无邮箱',
        changeRole: '修改角色',
        removeMember: '移除成员',
        unknown: '未知',
      }
    : {
        title: 'Team Members',
        invite: 'Invite Member',
        searchPlaceholder: 'Search username or email...',
        allRoles: 'All Roles',
        noMatches: 'No matching members found',
        totalMembers: 'Total',
        membersUnit: 'members',
        showing: 'showing',
        unknownUser: 'Unknown User',
        me: 'Me',
        noEmail: 'No email',
        changeRole: 'Change Role',
        removeMember: 'Remove Member',
        unknown: 'Unknown',
      };
  const roleOptions: EditorialSelectOption[] = [
    { value: '', label: text.allRoles },
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
    { value: 'guest', label: 'Guest' },
  ];
  // 只有 Owner 或 Admin 可以邀请成员
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';

  // 筛选成员
  const filteredMembers = members.filter((member) => {
    // 角色筛选
    if (roleFilter && member.role !== roleFilter) {
      return false;
    }
    // 搜索筛选（用户名或邮箱）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const username = member.user?.username?.toLowerCase() || '';
      const email = member.user?.email?.toLowerCase() || '';
      if (!username.includes(query) && !email.includes(query)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="editorial-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="eyebrow">{locale === 'zh' ? '团队成员' : 'Team Members'}</div>
          <h3 className="mt-3 text-xl font-semibold">{text.title}</h3>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            {locale === 'zh'
              ? '查看成员信息、调整角色，并管理团队邀请。'
              : 'View members, update roles, and manage team invitations.'}
          </p>
        </div>
        {canInvite && onInvite && (
          <div className="rounded-[22px] border border-border bg-white/72 p-2 lg:min-w-[180px]">
            <button
              onClick={onInvite}
              className="btn-primary w-full justify-center whitespace-nowrap text-sm py-2.5 px-5"
            >
              <i className="fas fa-user-plus mr-2" />
              {text.invite}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder={text.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-[18px] border border-border bg-white/80 py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <EditorialSelect
          value={roleFilter || ''}
          onChange={(value) => onRoleFilterChange((value as TeamRole) || null)}
          options={roleOptions}
          className="sm:w-[180px]"
          size="md"
        />
      </div>

      <div className="mt-5 space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border bg-white/45 py-10 text-center text-text-secondary">
            <i className="fas fa-users text-3xl mb-2 opacity-50" />
            <p>{text.noMatches}</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              locale={locale}
              text={text}
              onRoleChange={onRoleChange}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4 text-sm text-text-secondary">
        {text.totalMembers} {members.length} {text.membersUnit}
        {filteredMembers.length !== members.length && (
          <span> , {text.showing} {filteredMembers.length}</span>
        )}
      </div>
    </div>
  );
}

interface MemberItemProps {
  member: TeamMember;
  currentUserRole: TeamRole;
  currentUserId: string;
  locale: 'zh' | 'en';
  text: {
    unknownUser: string;
    me: string;
    noEmail: string;
    changeRole: string;
    removeMember: string;
    unknown: string;
  };
  onRoleChange?: (userId: string, newRole: TeamRole) => void;
  onRemove?: (userId: string) => void;
}

/**
 * 单个成员项组件
 */
function MemberItem({
  member,
  currentUserRole,
  currentUserId,
  locale,
  text,
  onRoleChange,
  onRemove,
}: MemberItemProps) {
  const isCurrentUser = member.user_id === currentUserId;
  const isOwner = member.role === 'owner';
  
  // 判断是否可以管理该成员
  const canManage = getCanManage(currentUserRole, member.role, isCurrentUser);
  
  // 获取可选的角色列表
  const availableRoles = getAvailableRoles(currentUserRole, member.role);

  // 格式化加入时间
  const joinedDate = formatDate(member.joined_at, locale, text.unknown);

  return (
    <div className="rounded-[22px] border border-border bg-white/72 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 ${getRoleAvatarBg(member.role)}`}>
            {member.user?.username ? (
              <span className="text-sm font-medium">
                {member.user.username.charAt(0).toUpperCase()}
              </span>
            ) : (
              <i className="fas fa-user text-sm" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {member.user?.username || text.unknownUser}
              </span>
              {isCurrentUser && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                  {text.me}
                </span>
              )}
            </div>
            <div className="text-sm text-text-secondary truncate">
              {member.user?.email || text.noEmail}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeStyle(member.role)}`}>
            {getRoleLabel(member.role)}
          </div>
          <div className="text-sm text-text-secondary min-w-[100px]">
            <i className="fas fa-calendar-alt mr-1" />
            {joinedDate}
          </div>

          {canManage && !isOwner && availableRoles.length > 0 && onRoleChange && (
            <EditorialSelect
              value={member.role}
              onChange={(value) => onRoleChange(member.user_id, value as TeamRole)}
              options={availableRoles.map((role) => ({
                value: role,
                label: getRoleLabel(role),
              }))}
              size="sm"
              className="min-w-[140px]"
              buttonClassName="rounded-full border-border bg-white/90 text-xs shadow-none"
              menuClassName="min-w-[180px]"
            />
          )}

          {canManage && !isOwner && onRemove && (
            <button
              onClick={() => onRemove(member.user_id)}
              className="rounded-full border border-danger/30 px-3 py-2 text-error transition-colors hover:bg-error/10"
              title={text.removeMember}
            >
              <i className="fas fa-user-minus text-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 判断当前用户是否可以管理目标成员
 */
function getCanManage(
  currentUserRole: TeamRole,
  targetRole: TeamRole,
  isCurrentUser: boolean
): boolean {
  // 不能管理自己（除了退出团队，但那是另一个操作）
  if (isCurrentUser) return false;
  
  // Owner 可以管理所有非 Owner 成员
  if (currentUserRole === 'owner') {
    return targetRole !== 'owner';
  }
  
  // Admin 只能管理 Member 和 Guest
  if (currentUserRole === 'admin') {
    return targetRole === 'member' || targetRole === 'guest';
  }
  
  // Member 和 Guest 不能管理任何人
  return false;
}

/**
 * 获取当前用户可以设置的角色列表
 */
function getAvailableRoles(currentUserRole: TeamRole, targetRole: TeamRole): TeamRole[] {
  // Owner 可以设置 admin, member, guest
  if (currentUserRole === 'owner') {
    return ['admin', 'member', 'guest'];
  }
  
  // Admin 只能设置 member, guest
  if (currentUserRole === 'admin') {
    // Admin 不能将成员提升为 admin
    if (targetRole === 'admin') return [];
    return ['member', 'guest'];
  }
  
  return [];
}

/**
 * 获取角色头像背景色
 */
function getRoleAvatarBg(role: TeamRole): string {
  const styles: Record<TeamRole, string> = {
    owner: 'bg-primary/20 text-primary',
    admin: 'bg-warning/20 text-warning',
    member: 'bg-success/20 text-success',
    guest: 'bg-secondary/20 text-secondary',
  };
  return styles[role];
}

/**
 * 获取角色标签样式
 */
function getRoleBadgeStyle(role: TeamRole): string {
  const styles: Record<TeamRole, string> = {
    owner: 'bg-primary/20 text-primary border border-primary/30',
    admin: 'bg-warning/20 text-warning border border-warning/30',
    member: 'bg-success/20 text-success border border-success/30',
    guest: 'bg-secondary/20 text-secondary border border-secondary/30',
  };
  return styles[role];
}

/**
 * 获取角色中文标签
 */
function getRoleLabel(role: TeamRole): string {
  const labels: Record<TeamRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    guest: 'Guest',
  };
  return labels[role];
}

/**
 * 格式化日期
 */
function formatDate(dateString: string, locale: 'zh' | 'en', fallback: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return fallback;
  }
}
