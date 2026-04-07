/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomBytes } from 'crypto';
import { createAuditLog, type ClientInfo } from '@/lib/auditLog';
import { createServerAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';
import type {
  PaginatedData,
  TeamInvitation,
  TeamRole,
  InvitationStatus,
  TeamInvitationQuery,
} from '@ai-gateway/shared-types/team';

const INVITATION_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

type InvitationRow = {
  id: string;
  team_id: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  status: InvitationStatus;
  invited_by: string;
  invited_user_id: string | null;
  responded_by: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

type UserSummary = {
  username: string;
  email: string | null;
};

type UserLookupRow = {
  id: string;
  username: string | null;
  email: string | null;
};

type TeamRow = {
  id: string;
  name: string;
};

type TeamMemberLookupRow = {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: 'active' | 'pending' | 'inactive';
  joined_at?: string | null;
};

type NotificationOutboxRow = {
  id: string;
  status: 'queued' | 'sent' | 'failed';
  error_message: string | null;
  updated_at: string;
  metadata: Record<string, unknown>;
};

function isInvitationFeatureUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const text = `${candidate.message || ''} ${candidate.details || ''}`.toLowerCase();

  return (
    candidate.code === 'PGRST205' ||
    text.includes('team_invitations') ||
    text.includes("teams.created_by") ||
    text.includes("could not find the table 'public.team_invitations'") ||
    text.includes("could not find the column 'created_by'")
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

async function getUsersMap(userIds: string[]): Promise<Map<string, UserSummary>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const supabase = createServerSupabaseClient();
  const { data: users } = await supabase
    .from('users')
    .select('id, username, email')
    .in('id', uniqueIds);

  const userRows = (users || []) as UserLookupRow[];

  return new Map(
    userRows.map((user) => [
      user.id,
      {
        username: user.username || user.email || '未命名用户',
        email: user.email,
      },
    ])
  );
}

function buildInvitationResponse(
  invitation: InvitationRow,
  inviter?: UserSummary,
  teamName?: string,
  inviteUrl?: string | null,
  delivery?: NotificationOutboxRow | null
): TeamInvitation {
  return {
    id: invitation.id,
    team_id: invitation.team_id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    invited_by: invitation.invited_by,
    invited_user_id: invitation.invited_user_id,
    responded_by: invitation.responded_by,
    expires_at: invitation.expires_at,
    responded_at: invitation.responded_at,
    created_at: invitation.created_at,
    updated_at: invitation.updated_at,
    invite_url: inviteUrl ?? null,
    inviter,
    team_name: teamName,
    notification_status: delivery?.status || null,
    notification_error: delivery?.error_message || null,
    notification_updated_at: delivery?.updated_at || null,
  };
}

async function getInvitationDeliveryMap(invitationIds: string[]): Promise<Map<string, NotificationOutboxRow>> {
  const uniqueIds = Array.from(new Set(invitationIds.filter(Boolean)));
  if (!uniqueIds.length) {
    return new Map();
  }

  const supabase = createServerAdminSupabaseClient();
  const { data } = await supabase
    .from('notification_outbox')
    .select('id, status, error_message, updated_at, metadata')
    .eq('channel', 'email')
    .in('metadata->>invitation_id', uniqueIds)
    .order('created_at', { ascending: false });

  const rows = (data || []) as NotificationOutboxRow[];
  const map = new Map<string, NotificationOutboxRow>();
  for (const row of rows) {
    const invitationId = String(row.metadata?.invitation_id || '');
    if (invitationId && !map.has(invitationId)) {
      map.set(invitationId, row);
    }
  }
  return map;
}

async function markExpiredInvitations(teamId?: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  let query = (supabase
    .from('team_invitations') as any)
    .update({
      status: 'expired',
      responded_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { error } = await query;
  if (error && !isInvitationFeatureUnavailable(error)) {
    throw error;
  }
}

export async function listTeamInvitations(
  teamId: string,
  query: TeamInvitationQuery = {}
): Promise<PaginatedData<TeamInvitation>> {
  await markExpiredInvitations(teamId);

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const offset = (page - 1) * limit;
  const supabase = createServerSupabaseClient();

  let dbQuery = (supabase
    .from('team_invitations') as any)
    .select('*', { count: 'exact' })
    .eq('team_id', teamId);

  if (query.status) {
    dbQuery = dbQuery.eq('status', query.status);
  }

  const { data, error, count } = await dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isInvitationFeatureUnavailable(error)) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        total_pages: 0,
      };
    }
    throw new Error('获取团队邀请失败');
  }

  const invitationRows = (data || []) as InvitationRow[];
  const inviterMap = await getUsersMap(invitationRows.map((item) => item.invited_by));
  const deliveryMap = await getInvitationDeliveryMap(invitationRows.map((item) => item.id));
  const items = invitationRows.map((item) =>
    buildInvitationResponse(item as InvitationRow, inviterMap.get(item.invited_by), undefined, undefined, deliveryMap.get(item.id))
  );

  return {
    items,
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  };
}

export async function createTeamInvitation(params: {
  teamId: string;
  inviterUserId: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  inviteBaseUrl: string;
  clientInfo: ClientInfo;
}): Promise<TeamInvitation> {
  const supabase = createServerSupabaseClient();
  const normalizedEmail = normalizeEmail(params.email);

  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', params.teamId)
    .single();
  const teamRow = team as TeamRow | null;

  if (!teamRow) {
    throw new Error('团队不存在');
  }

  const { data: invitedUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();
  const invitedUserRow = invitedUser as Pick<UserLookupRow, 'id' | 'email'> | null;

  if (invitedUserRow) {
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', params.teamId)
      .eq('user_id', invitedUserRow.id)
      .maybeSingle();
    const existingMemberRow = existingMember as Pick<TeamMemberLookupRow, 'id' | 'status'> | null;

    if (existingMemberRow?.status === 'active') {
      throw new Error('该用户已是团队成员');
    }
  }

  await markExpiredInvitations(params.teamId);

  const { data: existingInvitation } = await (supabase
    .from('team_invitations') as any)
    .select('id')
    .eq('team_id', params.teamId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvitation) {
    throw new Error('该邮箱已有待处理邀请');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_WINDOW_MS).toISOString();

  const { data: invitation, error } = await (supabase
    .from('team_invitations') as any)
    .insert({
      team_id: params.teamId,
      email: normalizedEmail,
      role: params.role,
      invited_by: params.inviterUserId,
      invited_user_id: invitedUserRow?.id || null,
      token_hash: hashInvitationToken(token),
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error || !invitation) {
    throw new Error('创建团队邀请失败');
  }

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.inviterUserId,
    action: 'member.invite',
    target_type: 'invitation',
    target_id: invitation.id,
    new_value: {
      email: normalizedEmail,
      role: params.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  const inviterMap = await getUsersMap([params.inviterUserId]);
  return buildInvitationResponse(
    invitation as InvitationRow,
    inviterMap.get(params.inviterUserId),
    teamRow.name,
    `${params.inviteBaseUrl.replace(/\/$/, '')}/accept-invite?token=${token}`
  );
}

export async function getTeamInvitationByToken(token: string): Promise<TeamInvitation | null> {
  const supabase = createServerSupabaseClient();
  const tokenHash = hashInvitationToken(token);

  const { data: invitation, error } = await (supabase
    .from('team_invitations') as any)
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error && isInvitationFeatureUnavailable(error)) {
    return null;
  }

  if (error || !invitation) {
    return null;
  }

  if (invitation.status === 'pending' && isExpired(invitation.expires_at)) {
    const { data: expired } = await (supabase
      .from('team_invitations') as any)
      .update({
        status: 'expired',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .select('*')
      .single();

    if (expired) {
      invitation.status = expired.status;
      invitation.responded_at = expired.responded_at;
      invitation.updated_at = expired.updated_at;
    }
  }

  const inviterMap = await getUsersMap([invitation.invited_by]);
  const deliveryMap = await getInvitationDeliveryMap([invitation.id]);
  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', invitation.team_id)
    .maybeSingle();
  const teamRow = team as Pick<TeamRow, 'name'> | null;

  return buildInvitationResponse(
    invitation as InvitationRow,
    inviterMap.get(invitation.invited_by),
    teamRow?.name,
    undefined,
    deliveryMap.get(invitation.id)
  );
}

export async function respondToTeamInvitation(params: {
  token: string;
  action: 'accept' | 'decline';
  userId: string;
  clientInfo: ClientInfo;
}): Promise<{ invitation: TeamInvitation; teamId: string }> {
  const supabase = createServerSupabaseClient();
  const invitation = await getTeamInvitationByToken(params.token);

  if (!invitation) {
    throw new Error('邀请不存在或已失效');
  }

  if (invitation.status !== 'pending') {
    throw new Error('邀请已处理或已过期');
  }

  if (isExpired(invitation.expires_at)) {
    throw new Error('邀请已过期');
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('id', params.userId)
    .single();
  const userRow = user as UserLookupRow | null;

  if (!userRow) {
    throw new Error('请先登录');
  }

  if (!userRow.email) {
    throw new Error('当前账号未绑定邮箱，无法接受此邀请');
  }

  if (normalizeEmail(userRow.email) !== normalizeEmail(invitation.email)) {
    throw new Error('当前账号与邀请邮箱不匹配');
  }

  const now = new Date().toISOString();

  if (params.action === 'accept') {
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', invitation.team_id)
      .eq('user_id', params.userId)
      .maybeSingle();
    const existingMemberRow = existingMember as TeamMemberLookupRow | null;

    if (existingMemberRow?.status === 'active') {
      throw new Error('您已经是团队成员');
    }

    if (existingMemberRow) {
      const { error: updateMemberError } = await (supabase
        .from('team_members' as any) as any)
        .update({
          role: invitation.role,
          status: 'active',
          joined_at: now,
        })
        .eq('id', existingMemberRow.id);

      if (updateMemberError) {
        throw new Error('接受邀请失败');
      }
    } else {
      const { error: insertMemberError } = await (supabase
        .from('team_members' as any) as any)
        .insert({
          team_id: invitation.team_id,
          user_id: params.userId,
          role: invitation.role,
          status: 'active',
        });

      if (insertMemberError) {
        throw new Error('接受邀请失败');
      }
    }
  }

  const nextStatus: InvitationStatus = params.action === 'accept' ? 'accepted' : 'declined';

  const { data: updatedInvitation, error: updateError } = await (supabase
    .from('team_invitations') as any)
    .update({
      status: nextStatus,
      invited_user_id: params.userId,
      responded_by: params.userId,
      responded_at: now,
    })
    .eq('id', invitation.id)
    .select('*')
    .single();

  if (updateError || !updatedInvitation) {
    throw new Error(params.action === 'accept' ? '接受邀请失败' : '拒绝邀请失败');
  }

  await createAuditLog({
    team_id: invitation.team_id,
    user_id: params.userId,
    action: params.action === 'accept' ? 'member.invite_accept' : 'member.invite_decline',
    target_type: 'invitation',
    target_id: invitation.id,
    new_value: {
      email: invitation.email,
      role: invitation.role,
      status: nextStatus,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  return {
    invitation: buildInvitationResponse(updatedInvitation as InvitationRow, {
      username: userRow.username || userRow.email || '未命名用户',
      email: userRow.email,
    }),
    teamId: invitation.team_id,
  };
}

export async function cancelTeamInvitation(params: {
  teamId: string;
  invitationId: string;
  operatorUserId: string;
  clientInfo: ClientInfo;
}): Promise<{ id: string }> {
  const supabase = createServerSupabaseClient();

  const { data: invitation, error } = await (supabase
    .from('team_invitations') as any)
    .select('*')
    .eq('id', params.invitationId)
    .eq('team_id', params.teamId)
    .single();

  if (error || !invitation) {
    throw new Error('邀请不存在');
  }

  if (invitation.status !== 'pending') {
    throw new Error('只能取消待处理邀请');
  }

  const { error: cancelError } = await (supabase
    .from('team_invitations') as any)
    .update({
      status: 'cancelled',
      responded_by: params.operatorUserId,
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  if (cancelError) {
    throw new Error('取消邀请失败');
  }

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.operatorUserId,
    action: 'member.invite_cancel',
    target_type: 'invitation',
    target_id: invitation.id,
    old_value: {
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
    },
    new_value: {
      status: 'cancelled',
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  return { id: invitation.id };
}
