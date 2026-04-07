import { createServerSupabaseClient, type Database } from '@/lib/supabase';
import type {
  MemberListQuery,
  PaginatedData,
  TeamDetail,
  TeamListItem,
  TeamMember,
  TeamRole,
} from '@ai-gateway/shared-types/team';

type BasicUserInfo = {
  username: string;
  email: string | null;
};

type TeamRecord = Database['public']['Tables']['teams']['Row'];
type TeamMemberRecord = Database['public']['Tables']['team_members']['Row'];
type UserRecord = Database['public']['Tables']['users']['Row'];

function buildUserInfoMap(
  users: Array<Pick<UserRecord, 'id' | 'username' | 'email'>>
): Map<string, BasicUserInfo> {
  return new Map(users.map((user) => [user.id, { username: user.username || user.email || '未命名用户', email: user.email }]));
}

function collectValidUserIds(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))
  );
}

export async function getTeamWorkspaceForUser(
  userId: string,
  requestedTeamId?: string | null
): Promise<{
  teams: TeamListItem[];
  selectedTeam: TeamListItem | null;
  currentTeam: TeamDetail | null;
  currentUserRole: TeamRole | null;
}> {
  const supabase = createServerSupabaseClient();

  const { data: membershipData, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, role, joined_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });
  const memberships = (membershipData || []) as Array<Pick<TeamMemberRecord, 'team_id' | 'role' | 'joined_at'>>;

  if (membershipError) {
    throw new Error('获取团队工作区失败');
  }

  if (memberships.length === 0) {
    return {
      teams: [],
      selectedTeam: null,
      currentTeam: null,
      currentUserRole: null,
    };
  }

  const teamIds = memberships.map((member) => member.team_id);

  const [{ data: teamsData, error: teamsError }, { data: activeMembersData, error: activeMembersError }] = await Promise.all([
    supabase.from('teams').select('*').in('id', teamIds),
    supabase.from('team_members').select('team_id').in('team_id', teamIds).eq('status', 'active'),
  ]);

  const teams = (teamsData || []) as TeamRecord[];
  const activeMembers = (activeMembersData || []) as Array<Pick<TeamMemberRecord, 'team_id'>>;

  if (teamsError || activeMembersError) {
    throw new Error('获取团队工作区失败');
  }

  const roleMap = new Map(memberships.map((member) => [member.team_id, member.role]));
  const memberCountMap = activeMembers.reduce<Map<string, number>>((accumulator, member) => {
    accumulator.set(member.team_id, (accumulator.get(member.team_id) || 0) + 1);
    return accumulator;
  }, new Map());

  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const teamItems: TeamListItem[] = memberships
    .map((membership) => {
      const team = teamMap.get(membership.team_id);
      if (!team) {
        return null;
      }

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        logo: team.logo,
        slug: team.slug,
        website: team.website,
        brand_color: team.brand_color,
        logo_path: team.logo_path,
        owner_id: team.owner_id,
        created_by: team.created_by,
        created_at: team.created_at,
        updated_at: team.updated_at,
        member_count: memberCountMap.get(team.id) || 0,
        user_role: roleMap.get(team.id) as TeamRole,
      };
    })
    .filter((team): team is TeamListItem => team !== null);

  const selectedTeam =
    (requestedTeamId
      ? teamItems.find((team) => team.id === requestedTeamId)
      : null) || teamItems[0] || null;

  if (!selectedTeam) {
    return {
      teams: teamItems,
      selectedTeam: null,
      currentTeam: null,
      currentUserRole: null,
    };
  }

  const { data: selectedMemberRecordsData, error: selectedMemberError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', selectedTeam.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });
  const selectedMemberRecords = (selectedMemberRecordsData || []) as TeamMemberRecord[];

  if (selectedMemberError) {
    throw new Error('获取团队工作区失败');
  }

  const selectedTeamRecord = teamMap.get(selectedTeam.id);
  if (!selectedTeamRecord) {
    throw new Error('团队不存在');
  }

  const userIds = collectValidUserIds([
    ...selectedMemberRecords.map((member) => member.user_id),
    selectedTeamRecord.owner_id,
    selectedTeamRecord.created_by,
  ]);

  let userMap = new Map<string, BasicUserInfo>();
  if (userIds.length > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);
    const users = (usersData || []) as Array<Pick<UserRecord, 'id' | 'username' | 'email'>>;

    if (usersError) {
      throw new Error('获取团队工作区失败');
    }

    userMap = buildUserInfoMap(users);
  }

  const currentMembers: TeamMember[] = selectedMemberRecords.map((member) => ({
    id: member.id,
    team_id: member.team_id,
    user_id: member.user_id,
    role: member.role,
    status: member.status,
    joined_at: member.joined_at,
    updated_at: member.updated_at,
    user: userMap.get(member.user_id),
  }));

  const currentTeam: TeamDetail = {
    id: selectedTeamRecord.id,
    name: selectedTeamRecord.name,
    description: selectedTeamRecord.description,
    logo: selectedTeamRecord.logo,
    slug: selectedTeamRecord.slug,
    website: selectedTeamRecord.website,
    brand_color: selectedTeamRecord.brand_color,
    logo_path: selectedTeamRecord.logo_path,
    owner_id: selectedTeamRecord.owner_id,
    created_by: selectedTeamRecord.created_by,
    created_at: selectedTeamRecord.created_at,
    updated_at: selectedTeamRecord.updated_at,
    members: currentMembers,
    member_count: currentMembers.length,
    owner_user: userMap.get(selectedTeamRecord.owner_id),
    created_by_user: userMap.get(selectedTeamRecord.created_by),
  };

  return {
    teams: teamItems,
    selectedTeam,
    currentTeam,
    currentUserRole: selectedTeam.user_role,
  };
}

export async function listTeamsForUser(
  userId: string,
  options: { page?: number; limit?: number } = {}
): Promise<PaginatedData<TeamListItem>> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  const { data: memberRecordsData, error: memberError } = await supabase
    .from('team_members')
    .select('team_id, role, joined_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .range(offset, offset + limit - 1);
  const memberRecords = (memberRecordsData || []) as Array<Pick<TeamMemberRecord, 'team_id' | 'role' | 'joined_at'>>;

  if (memberError) {
    throw new Error('获取团队列表失败');
  }

  if (!memberRecords.length) {
    return {
      items: [],
      total: 0,
      page,
      limit,
      total_pages: 0,
    };
  }

  const teamIds = memberRecords.map((member) => member.team_id);
  const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*').in('id', teamIds);
  const teams = (teamsData || []) as TeamRecord[];
  if (teamsError) {
    throw new Error('获取团队列表失败');
  }

  const { data: allActiveMembersData, error: allActiveMembersError } = await supabase
    .from('team_members')
    .select('team_id')
    .in('team_id', teamIds)
    .eq('status', 'active');
  const allActiveMembers = (allActiveMembersData || []) as Array<Pick<TeamMemberRecord, 'team_id'>>;

  if (allActiveMembersError) {
    throw new Error('获取团队列表失败');
  }

  const roleMap = new Map(memberRecords.map((member) => [member.team_id, member.role]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const memberCountMap = allActiveMembers.reduce<Map<string, number>>((accumulator, member) => {
    accumulator.set(member.team_id, (accumulator.get(member.team_id) || 0) + 1);
    return accumulator;
  }, new Map());

  const items: TeamListItem[] = memberRecords
    .map((member) => {
      const team = teamMap.get(member.team_id);
      if (!team) {
        return null;
      }

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        logo: team.logo,
        slug: team.slug,
        website: team.website,
        brand_color: team.brand_color,
        logo_path: team.logo_path,
        owner_id: team.owner_id,
        created_by: team.created_by,
        created_at: team.created_at,
        updated_at: team.updated_at,
        member_count: memberCountMap.get(team.id) || 0,
        user_role: roleMap.get(team.id) as TeamRole,
      };
    })
    .filter((team): team is TeamListItem => team !== null);

  const { count: totalCount } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  const total = totalCount || items.length;
  return {
    items,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

export async function getTeamDetailById(teamId: string): Promise<TeamDetail | null> {
  const supabase = createServerSupabaseClient();

  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  const team = teamData as TeamRecord | null;

  if (teamError || !team) {
    return null;
  }

  const { data: memberRecordsData, error: memberError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });
  const memberRecords = (memberRecordsData || []) as TeamMemberRecord[];

  if (memberError) {
    throw new Error('获取团队详情失败');
  }

  const userIds = collectValidUserIds([
    ...memberRecords.map((member) => member.user_id),
    team.owner_id,
    team.created_by,
  ]);
  let userMap = new Map<string, BasicUserInfo>();

  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);
    const users = (usersData || []) as Array<Pick<UserRecord, 'id' | 'username' | 'email'>>;

    if (users.length > 0) {
      userMap = buildUserInfoMap(users);
    }
  }

  const members: TeamMember[] = memberRecords.map((member) => ({
    id: member.id,
    team_id: member.team_id,
    user_id: member.user_id,
    role: member.role,
    status: member.status,
    joined_at: member.joined_at,
    updated_at: member.updated_at,
    user: userMap.get(member.user_id),
  }));

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    logo: team.logo,
    slug: team.slug,
    website: team.website,
    brand_color: team.brand_color,
    logo_path: team.logo_path,
    owner_id: team.owner_id,
    created_by: team.created_by,
    created_at: team.created_at,
    updated_at: team.updated_at,
    members,
    member_count: members.length,
    owner_user: userMap.get(team.owner_id),
    created_by_user: userMap.get(team.created_by),
  };
}

export async function listTeamMembers(
  teamId: string,
  query: MemberListQuery = {}
): Promise<PaginatedData<TeamMember>> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const roleFilter = query.role ?? null;
  const searchQuery = query.search?.trim() || '';
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  let memberQuery = supabase
    .from('team_members')
    .select('*', { count: 'exact' })
    .eq('team_id', teamId)
    .eq('status', 'active');

  if (roleFilter && ['owner', 'admin', 'member', 'guest'].includes(roleFilter)) {
    memberQuery = memberQuery.eq('role', roleFilter);
  }

  memberQuery = memberQuery.order('joined_at', { ascending: true }).range(offset, offset + limit - 1);
  const { data: memberRecordsData, error: memberError, count } = await memberQuery;
  const memberRecords = (memberRecordsData || []) as TeamMemberRecord[];

  if (memberError) {
    throw new Error('获取成员列表失败');
  }

  const userIds = memberRecords.map((member) => member.user_id);
  let userMap = new Map<string, BasicUserInfo>();

  if (userIds.length > 0) {
    let userQuery = supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);

    if (searchQuery) {
      userQuery = userQuery.or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data: usersData } = await userQuery;
    const users = (usersData || []) as Array<Pick<UserRecord, 'id' | 'username' | 'email'>>;
    if (users.length > 0) {
      userMap = buildUserInfoMap(users);
    }
  }

  let items: TeamMember[] = memberRecords
    .filter((member) => (searchQuery ? userMap.has(member.user_id) : true))
    .map((member) => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
      joined_at: member.joined_at,
      updated_at: member.updated_at,
      user: userMap.get(member.user_id),
    }));

  let total = count || 0;
  if (searchQuery) {
    total = items.length;
    items = items.slice(0, limit);
  }

  return {
    items,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}
