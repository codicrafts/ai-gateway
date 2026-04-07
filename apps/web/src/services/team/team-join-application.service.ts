import { createAuditLog, type ClientInfo } from '@/lib/auditLog';
import { createServerAdminSupabaseClient } from '@/lib/supabase';
import type {
  JoinApplicationStatus,
  PaginatedData,
  TeamJoinApplication,
  TeamRole,
} from '@ai-gateway/shared-types/team';

type ApplicationRow = {
  id: string;
  team_id: string;
  applicant_user_id: string;
  requested_role: 'member' | 'guest';
  status: JoinApplicationStatus;
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeamSummaryRow = {
  id: string;
  name: string;
  slug: string;
};

type UserSummaryRow = {
  id: string;
  username: string | null;
  email: string | null;
};

async function getUsersMap(userIds: string[]) {
  const supabase = createServerAdminSupabaseClient();
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) {
    return new Map<string, { username: string; email: string | null }>();
  }

  const { data } = await supabase
    .from('users')
    .select('id, username, email')
    .in('id', uniqueIds);

  const rows = (data || []) as UserSummaryRow[];
  return new Map(rows.map((row) => [row.id, { username: row.username || row.email || '未命名用户', email: row.email }]));
}

function toJoinApplication(
  row: ApplicationRow,
  team: TeamSummaryRow | null,
  users: Map<string, { username: string; email: string | null }>
): TeamJoinApplication {
  return {
    id: row.id,
    team_id: row.team_id,
    applicant_user_id: row.applicant_user_id,
    requested_role: row.requested_role,
    status: row.status,
    message: row.message,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    applicant: users.get(row.applicant_user_id),
    reviewer: row.reviewed_by ? users.get(row.reviewed_by) : undefined,
    team_name: team?.name,
    team_slug: team?.slug,
  };
}

export async function createTeamJoinApplication(params: {
  applicantUserId: string;
  slug: string;
  requestedRole: Extract<TeamRole, 'member' | 'guest'>;
  message?: string | null;
  clientInfo: ClientInfo;
}): Promise<TeamJoinApplication> {
  const supabase = createServerAdminSupabaseClient();
  const slug = params.slug.trim().toLowerCase();

  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, slug')
    .ilike('slug', slug)
    .maybeSingle();
  const team = (teamData as TeamSummaryRow | null) || null;

  if (!team) {
    throw new Error('团队不存在');
  }

  const { data: existingMembership } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('team_id', team.id)
    .eq('user_id', params.applicantUserId)
    .maybeSingle();

  if (existingMembership?.status === 'active') {
    throw new Error('你已加入该团队');
  }

  const { data: existingPending } = await supabase
    .from('team_join_applications')
    .select('id')
    .eq('team_id', team.id)
    .eq('applicant_user_id', params.applicantUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) {
    throw new Error('你已有待处理申请');
  }

  const { data, error } = await supabase
    .from('team_join_applications')
    .insert({
      team_id: team.id,
      applicant_user_id: params.applicantUserId,
      requested_role: params.requestedRole,
      message: params.message?.trim() || null,
    } as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('提交加入申请失败');
  }

  await createAuditLog({
    team_id: team.id,
    user_id: params.applicantUserId,
    action: 'team.join_apply',
    target_type: 'team_join_application',
    target_id: data.id,
    new_value: {
      requested_role: data.requested_role,
      message: data.message,
      status: data.status,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  const users = await getUsersMap([params.applicantUserId]);
  return toJoinApplication(data as ApplicationRow, team, users);
}

export async function listTeamJoinApplications(params: {
  teamId: string;
  page?: number;
  limit?: number;
  status?: JoinApplicationStatus;
}): Promise<PaginatedData<TeamJoinApplication>> {
  const supabase = createServerAdminSupabaseClient();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('team_join_applications')
    .select('*', { count: 'exact' })
    .eq('team_id', params.teamId);

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error('获取团队申请失败');
  }

  const rows = (data || []) as ApplicationRow[];
  const users = await getUsersMap(rows.flatMap((row) => [row.applicant_user_id, row.reviewed_by || '']));
  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, slug')
    .eq('id', params.teamId)
    .maybeSingle();
  const team = (teamData as TeamSummaryRow | null) || null;

  return {
    items: rows.map((row) => toJoinApplication(row, team, users)),
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  };
}

export async function listUserJoinApplications(userId: string): Promise<TeamJoinApplication[]> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('team_join_applications')
    .select('*')
    .eq('applicant_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error('获取申请记录失败');
  }

  const rows = (data || []) as ApplicationRow[];
  const users = await getUsersMap(rows.flatMap((row) => [row.applicant_user_id, row.reviewed_by || '']));
  const teamIds = Array.from(new Set(rows.map((row) => row.team_id)));
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, slug')
    .in('id', teamIds);
  const teamMap = new Map(((teamsData || []) as TeamSummaryRow[]).map((team) => [team.id, team]));

  return rows.map((row) => toJoinApplication(row, teamMap.get(row.team_id) || null, users));
}

export async function reviewTeamJoinApplication(params: {
  teamId: string;
  applicationId: string;
  reviewerUserId: string;
  decision: 'approve' | 'reject';
  clientInfo: ClientInfo;
}): Promise<TeamJoinApplication> {
  const supabase = createServerAdminSupabaseClient();
  const { data: appData } = await supabase
    .from('team_join_applications')
    .select('*')
    .eq('id', params.applicationId)
    .eq('team_id', params.teamId)
    .maybeSingle();
  const application = (appData as ApplicationRow | null) || null;

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== 'pending') {
    throw new Error('该申请已处理');
  }

  const nextStatus: JoinApplicationStatus = params.decision === 'approve' ? 'approved' : 'rejected';
  const reviewedAt = new Date().toISOString();

  if (params.decision === 'approve') {
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', params.teamId)
      .eq('user_id', application.applicant_user_id)
      .maybeSingle();

    if (existingMember) {
      await supabase
        .from('team_members')
        .update({
          role: application.requested_role,
          status: 'active',
          updated_at: reviewedAt,
        } as never)
        .eq('id', existingMember.id);
    } else {
      await supabase
        .from('team_members')
        .insert({
          team_id: params.teamId,
          user_id: application.applicant_user_id,
          role: application.requested_role,
          status: 'active',
        } as never);
    }
  }

  const { data, error } = await supabase
    .from('team_join_applications')
    .update({
      status: nextStatus,
      reviewed_by: params.reviewerUserId,
      reviewed_at: reviewedAt,
    } as never)
    .eq('id', params.applicationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('处理申请失败');
  }

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.reviewerUserId,
    action: params.decision === 'approve' ? 'team.join_approve' : 'team.join_reject',
    target_type: 'team_join_application',
    target_id: params.applicationId,
    old_value: {
      status: application.status,
      requested_role: application.requested_role,
    },
    new_value: {
      status: data.status,
      requested_role: data.requested_role,
      applicant_user_id: data.applicant_user_id,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  const users = await getUsersMap([data.applicant_user_id, params.reviewerUserId]);
  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, slug')
    .eq('id', params.teamId)
    .maybeSingle();
  return toJoinApplication(data as ApplicationRow, (teamData as TeamSummaryRow | null) || null, users);
}
