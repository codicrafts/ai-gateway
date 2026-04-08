import { createAuditLog, type ClientInfo } from '@/lib/auditLog';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import { ensureUserExists } from '@/lib/oneapi';
import { canLeaveTeam, canModifyRole, canRemoveMember } from '@/lib/teamAuth';
import type {
  CreateTeamRequest,
  Team,
  TeamMember,
  TeamRole,
  UpdateTeamRequest,
} from '@ai-gateway/shared-types/team';

type TeamRecord = Database['public']['Tables']['teams']['Row'];
type TeamInsert = Database['public']['Tables']['teams']['Insert'];
type TeamUpdate = Database['public']['Tables']['teams']['Update'];
type TeamMemberRecord = Database['public']['Tables']['team_members']['Row'];
type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert'];
type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update'];
type UserRecord = Database['public']['Tables']['users']['Row'];
type BasicUserRecord = Pick<UserRecord, 'username' | 'email'>;
type InvitedUserRecord = Pick<UserRecord, 'id' | 'email' | 'username'>;

function normalizeTeamSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildDefaultTeamSlug(name: string): string {
  return normalizeTeamSlug(name) || 'team';
}

export function validateTeamSlug(slug: string | undefined | null): string | null {
  if (slug === undefined || slug === null) {
    return null;
  }

  const normalized = normalizeTeamSlug(slug);
  if (!normalized) {
    return '团队标识不能为空';
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return '团队标识只能包含小写字母、数字和连字符';
  }
  return null;
}

export function validateTeamWebsite(website: string | undefined | null): string | null {
  if (!website) {
    return null;
  }

  try {
    const parsed = new URL(website);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '团队网址必须以 http 或 https 开头';
    }
    return null;
  } catch {
    return '团队网址格式无效';
  }
}

export function validateTeamBrandColor(color: string | undefined | null): string | null {
  if (!color) {
    return null;
  }

  if (!/^#([0-9a-fA-F]{6})$/.test(color)) {
    return '品牌色需为 6 位十六进制颜色值';
  }
  return null;
}

async function getUserInfoById(userId: string): Promise<BasicUserRecord | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data: userData, error } = await supabase
    .from('users')
    .select('username, email')
    .eq('id', userId)
    .single();

  if (error || !userData) {
    return null;
  }

  return userData;
}

function buildTeamMemberResponse(member: TeamMemberRecord, userData: BasicUserRecord | null): TeamMember {
  return {
    id: member.id,
    team_id: member.team_id,
    user_id: member.user_id,
    role: member.role,
    status: member.status,
    joined_at: member.joined_at,
    updated_at: member.updated_at,
    user: userData ? { username: userData.username || userData.email || '未命名用户', email: userData.email } : undefined,
  };
}

export function validateTeamName(name: string | undefined | null, required: boolean = false): string | null {
  if ((name === undefined || name === null) && !required) {
    return null;
  }

  if (!name || name.trim().length === 0) {
    return '团队名称不能为空';
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return '团队名称至少需要 2 个字符';
  }
  if (trimmedName.length > 100) {
    return '团队名称不能超过 100 个字符';
  }

  return null;
}

export async function createTeamWithOwner(params: {
  userId: string;
  request: CreateTeamRequest;
  clientInfo: ClientInfo;
}): Promise<Team> {
  const supabase = createServerAdminSupabaseClient();
  const { userId, request, clientInfo } = params;
  const requestedSlug = normalizeTeamSlug(request.slug || buildDefaultTeamSlug(request.name));
  const { data: existingSlugTeam } = await supabase
    .from('teams')
    .select('id')
    .ilike('slug', requestedSlug)
    .maybeSingle();

  if (existingSlugTeam) {
    throw new Error('团队标识已被占用');
  }

  const teamInsert: TeamInsert = {
    name: request.name.trim(),
    description: request.description?.trim() || null,
    logo: request.logo || null,
    slug: requestedSlug,
    website: request.website?.trim() || null,
    brand_color: request.brand_color?.trim() || null,
    logo_path: null,
    owner_id: userId,
    created_by: userId,
  };

  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .insert(teamInsert as never)
    .select()
    .single();
  const team = teamData as TeamRecord | null;

  if (teamError || !team) {
    console.error('创建团队写入 teams 失败:', teamError);
    if (teamError?.code === 'PGRST204' && teamError.message?.includes('created_by')) {
      throw new Error('数据库缺少 teams.created_by 字段，请先执行 009_team_invitation_flow.sql 迁移');
    }
    throw new Error('创建团队失败');
  }
  const memberInsert: TeamMemberInsert = {
    team_id: team.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
  };

  const { error: memberError } = await supabase
    .from('team_members')
    .insert(memberInsert as never);

  if (memberError) {
    console.error('创建团队写入 team_members 失败:', memberError);
    await supabase.from('teams').delete().eq('id', team.id);
    throw new Error('创建团队失败');
  }

  await createAuditLog({
    team_id: team.id,
    user_id: userId,
    action: 'team.create',
    target_type: 'team',
    target_id: team.id,
    new_value: {
      name: team.name,
      description: team.description,
      logo: team.logo,
      slug: team.slug,
      website: team.website,
      brand_color: team.brand_color,
    },
    ip_address: clientInfo.ip_address,
    user_agent: clientInfo.user_agent,
  });

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
  };
}

export async function updateTeamProfile(params: {
  teamId: string;
  userId: string;
  request: UpdateTeamRequest;
  clientInfo: ClientInfo;
}): Promise<Team> {
  const supabase = createServerAdminSupabaseClient();
  const { teamId, userId, request, clientInfo } = params;

  const { data: existingTeamData, error: existingTeamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  const existingTeam = existingTeamData as TeamRecord | null;

  if (existingTeamError || !existingTeam) {
    throw new Error('团队不存在');
  }

  const updateData: TeamUpdate = {};
  const nextSlug = request.slug !== undefined ? normalizeTeamSlug(request.slug) : existingTeam.slug;

  if (request.slug !== undefined && nextSlug !== existingTeam.slug) {
    const { data: existingSlugTeam } = await supabase
      .from('teams')
      .select('id')
      .ilike('slug', nextSlug)
      .neq('id', teamId)
      .maybeSingle();

    if (existingSlugTeam) {
      throw new Error('团队标识已被占用');
    }
  }

  if (request.name !== undefined) {
    updateData.name = request.name.trim();
  }
  if (request.description !== undefined) {
    updateData.description = request.description?.trim() || null;
  }
  if (request.logo !== undefined) {
    updateData.logo = request.logo || null;
  }
  if (request.slug !== undefined) {
    updateData.slug = nextSlug;
  }
  if (request.website !== undefined) {
    updateData.website = request.website?.trim() || null;
  }
  if (request.brand_color !== undefined) {
    updateData.brand_color = request.brand_color?.trim() || null;
  }

  const { data: updatedTeamData, error: updateError } = await supabase
    .from('teams')
    .update(updateData as never)
    .eq('id', teamId)
    .select()
    .single();
  const updatedTeam = updatedTeamData as TeamRecord | null;

  if (updateError || !updatedTeam) {
    throw new Error('更新团队失败');
  }

  await createAuditLog({
    team_id: teamId,
    user_id: userId,
    action: 'team.update',
    target_type: 'team',
    target_id: teamId,
    old_value: {
      name: existingTeam.name,
      description: existingTeam.description,
      logo: existingTeam.logo,
      slug: existingTeam.slug,
      website: existingTeam.website,
      brand_color: existingTeam.brand_color,
    },
    new_value: {
      name: updatedTeam.name,
      description: updatedTeam.description,
      logo: updatedTeam.logo,
      slug: updatedTeam.slug,
      website: updatedTeam.website,
      brand_color: updatedTeam.brand_color,
    },
    ip_address: clientInfo.ip_address,
    user_agent: clientInfo.user_agent,
  });

  return {
    id: updatedTeam.id,
    name: updatedTeam.name,
    description: updatedTeam.description,
    logo: updatedTeam.logo,
    slug: updatedTeam.slug,
    website: updatedTeam.website,
    brand_color: updatedTeam.brand_color,
    logo_path: updatedTeam.logo_path,
    owner_id: updatedTeam.owner_id,
    created_by: updatedTeam.created_by,
    created_at: updatedTeam.created_at,
    updated_at: updatedTeam.updated_at,
  };
}

export async function deleteTeamById(params: {
  teamId: string;
  userId: string;
  clientInfo: ClientInfo;
}): Promise<{ id: string }> {
  const supabase = createServerAdminSupabaseClient();
  const { teamId, userId, clientInfo } = params;

  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  const team = teamData as TeamRecord | null;

  if (teamError || !team) {
    throw new Error('团队不存在');
  }

  await createAuditLog({
    team_id: teamId,
    user_id: userId,
    action: 'team.delete',
    target_type: 'team',
    target_id: teamId,
    old_value: {
      name: team.name,
      description: team.description,
      logo: team.logo,
      owner_id: team.owner_id,
    },
    ip_address: clientInfo.ip_address,
    user_agent: clientInfo.user_agent,
  });

  const { error: deleteError } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (deleteError) {
    throw new Error('删除团队失败');
  }

  return { id: teamId };
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidInviteRole(role: string): role is Exclude<TeamRole, 'owner'> {
  return ['admin', 'member', 'guest'].includes(role);
}

export async function inviteTeamMember(params: {
  teamId: string;
  inviterUserId: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  clientInfo: ClientInfo;
}): Promise<TeamMember> {
  const supabase = createServerAdminSupabaseClient();
  const normalizedEmail = params.email.toLowerCase();

  const { data: invitedUserData, error: userError } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('email', normalizedEmail)
    .single();
  const invitedUser = invitedUserData as InvitedUserRecord | null;

  if (userError || !invitedUser) {
    throw new Error('用户不存在，请确认邮箱地址正确');
  }

  const { data: existingMemberData, error: memberCheckError } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('team_id', params.teamId)
    .eq('user_id', invitedUser.id)
    .single();
  const existingMember = existingMemberData as Pick<TeamMemberRecord, 'id' | 'status'> | null;

  if (!memberCheckError && existingMember) {
    throw new Error('该用户已是团队成员');
  }

  const memberInsert: TeamMemberInsert = {
    team_id: params.teamId,
    user_id: invitedUser.id,
    role: params.role,
    status: 'active',
  };

  const { data: newMemberData, error: insertError } = await supabase
    .from('team_members')
    .insert(memberInsert as never)
    .select()
    .single();
  const newMember = newMemberData as TeamMemberRecord | null;

  if (insertError || !newMember) {
    throw new Error('邀请成员失败');
  }

  let oneApiUserId: number | undefined;
  try {
    if (invitedUser.email) {
      const oneApiResult = await ensureUserExists(invitedUser.email, invitedUser.username || undefined);
      if (oneApiResult.success && oneApiResult.user) {
        oneApiUserId = oneApiResult.user.id;
      }
    }
  } catch {
    // best effort only
  }

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.inviterUserId,
    action: 'member.invite',
    target_type: 'member',
    target_id: invitedUser.id,
    new_value: {
      email: invitedUser.email,
      username: invitedUser.username,
      role: params.role,
      one_api_user_id: oneApiUserId,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  return {
    id: newMember.id,
    team_id: newMember.team_id,
    user_id: newMember.user_id,
    role: newMember.role,
    status: newMember.status,
    joined_at: newMember.joined_at,
    updated_at: newMember.updated_at,
    user: {
      username: invitedUser.username || invitedUser.email || '未命名用户',
      email: invitedUser.email,
    },
  };
}

export async function updateTeamMemberRole(params: {
  teamId: string;
  targetUserId: string;
  operatorUserId: string;
  operatorRole: TeamRole;
  newRole: Exclude<TeamRole, 'owner'>;
  clientInfo: ClientInfo;
}): Promise<TeamMember> {
  const supabase = createServerAdminSupabaseClient();

  const { data: targetMemberData, error: memberError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', params.teamId)
    .eq('user_id', params.targetUserId)
    .single();
  const targetMember = targetMemberData as TeamMemberRecord | null;

  if (memberError || !targetMember) {
    throw new Error('成员不存在');
  }

  const targetRole = targetMember.role as TeamRole;

  if (!canModifyRole(params.operatorRole, targetRole, params.newRole)) {
    if (targetRole === 'owner') {
      throw new Error('不能修改 Owner 的角色');
    }
    if (params.operatorRole === 'admin' && targetRole === 'admin') {
      throw new Error('Admin 不能修改其他 Admin 的角色');
    }
    if (params.operatorRole === 'admin' && params.newRole === 'admin') {
      throw new Error('Admin 只能将成员设置为 member 或 guest');
    }
    throw new Error('权限不足，无法修改该成员的角色');
  }

  const userData = await getUserInfoById(params.targetUserId);

  if (targetRole === params.newRole) {
    return buildTeamMemberResponse(
      {
        id: targetMember.id,
        team_id: targetMember.team_id,
        user_id: targetMember.user_id,
        role: targetMember.role,
        status: targetMember.status,
        joined_at: targetMember.joined_at,
        updated_at: targetMember.updated_at,
      },
      userData
    );
  }

  const memberUpdate: TeamMemberUpdate = { role: params.newRole };

  const { data: updatedMemberData, error: updateError } = await supabase
    .from('team_members')
    .update(memberUpdate as never)
    .eq('id', targetMember.id)
    .select()
    .single();
  const updatedMember = updatedMemberData as TeamMemberRecord | null;

  if (updateError || !updatedMember) {
    throw new Error('更新成员角色失败');
  }

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.operatorUserId,
    action: 'member.role_change',
    target_type: 'member',
    target_id: params.targetUserId,
    old_value: {
      role: targetRole,
      username: userData?.username,
      email: userData?.email,
    },
    new_value: {
      role: params.newRole,
      username: userData?.username,
      email: userData?.email,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  return buildTeamMemberResponse(
    {
      id: updatedMember.id,
      team_id: updatedMember.team_id,
      user_id: updatedMember.user_id,
      role: updatedMember.role,
      status: updatedMember.status,
      joined_at: updatedMember.joined_at,
      updated_at: updatedMember.updated_at,
    },
    userData
  );
}

export async function removeTeamMember(params: {
  teamId: string;
  targetUserId: string;
  operatorUserId: string;
  operatorRole: TeamRole;
  clientInfo: ClientInfo;
}): Promise<{ user_id: string }> {
  const supabase = createServerAdminSupabaseClient();
  const isSelfLeave = params.operatorUserId === params.targetUserId;

  const { data: targetMemberData, error: memberError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', params.teamId)
    .eq('user_id', params.targetUserId)
    .single();
  const targetMember = targetMemberData as TeamMemberRecord | null;

  if (memberError || !targetMember) {
    throw new Error('成员不存在');
  }

  const targetRole = targetMember.role as TeamRole;

  if (isSelfLeave) {
    if (!canLeaveTeam(targetRole)) {
      throw new Error('Owner 不能退出团队，请先转让所有权');
    }
  } else {
    if (!['owner', 'admin'].includes(params.operatorRole)) {
      throw new Error('只有 Owner 或 Admin 可以移除成员');
    }

    if (!canRemoveMember(params.operatorRole, targetRole)) {
      if (targetRole === 'owner') {
        throw new Error('不能移除 Owner');
      }
      if (params.operatorRole === 'admin' && targetRole === 'admin') {
        throw new Error('Admin 不能移除其他 Admin');
      }
      throw new Error('权限不足，无法移除该成员');
    }
  }

  const userData = await getUserInfoById(params.targetUserId);

  const { error: deleteError } = await supabase
    .from('team_members')
    .delete()
    .eq('id', targetMember.id);

  if (deleteError) {
    throw new Error('移除成员失败');
  }

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.operatorUserId,
    action: 'member.remove',
    target_type: 'member',
    target_id: params.targetUserId,
    old_value: {
      role: targetRole,
      username: userData?.username,
      email: userData?.email,
      is_self_leave: isSelfLeave,
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  return { user_id: params.targetUserId };
}

export async function transferTeamOwnership(params: {
  teamId: string;
  currentOwnerId: string;
  newOwnerId: string;
  clientInfo: ClientInfo;
}): Promise<{ old_owner: TeamMember; new_owner: TeamMember }> {
  const supabase = createServerAdminSupabaseClient();

  if (params.newOwnerId === params.currentOwnerId) {
    throw new Error('不能将所有权转让给自己');
  }

  const { data: targetMemberData, error: targetError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', params.teamId)
    .eq('user_id', params.newOwnerId)
    .single();
  const targetMember = targetMemberData as TeamMemberRecord | null;

  if (targetError || !targetMember) {
    throw new Error('目标用户不是团队成员');
  }

  if (targetMember.status !== 'active') {
    throw new Error('目标用户不是活跃的团队成员');
  }

  const { data: currentOwnerMemberData, error: ownerError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', params.teamId)
    .eq('user_id', params.currentOwnerId)
    .single();
  const currentOwnerMember = currentOwnerMemberData as TeamMemberRecord | null;

  if (ownerError || !currentOwnerMember) {
    throw new Error('当前 Owner 成员记录不存在');
  }

  const targetOldRole = targetMember.role as TeamRole;
  const targetOwnerUpdate: TeamMemberUpdate = { role: 'owner' };

  const { error: updateTargetError } = await supabase
    .from('team_members')
    .update(targetOwnerUpdate as never)
    .eq('id', targetMember.id);

  if (updateTargetError) {
    throw new Error('转让所有权失败');
  }

  const currentOwnerUpdate: TeamMemberUpdate = { role: 'admin' };
  const { error: updateOwnerError } = await supabase
    .from('team_members')
    .update(currentOwnerUpdate as never)
    .eq('id', currentOwnerMember.id);

  if (updateOwnerError) {
    await supabase
      .from('team_members')
      .update({ role: targetOldRole } as never)
      .eq('id', targetMember.id);

    throw new Error('转让所有权失败');
  }

  const teamOwnerUpdate: TeamUpdate = { owner_id: params.newOwnerId };
  const { error: updateTeamError } = await supabase
    .from('teams')
    .update(teamOwnerUpdate as never)
    .eq('id', params.teamId);

  if (updateTeamError) {
    await supabase
      .from('team_members')
      .update({ role: targetOldRole } as never)
      .eq('id', targetMember.id);
    await supabase
      .from('team_members')
      .update({ role: 'owner' } as never)
      .eq('id', currentOwnerMember.id);

    throw new Error('转让所有权失败');
  }

  const { data: updatedTargetMemberData } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', targetMember.id)
    .single();
  const updatedTargetMember = updatedTargetMemberData as TeamMemberRecord | null;

  const { data: updatedOwnerMemberData } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', currentOwnerMember.id)
    .single();
  const updatedOwnerMember = updatedOwnerMemberData as TeamMemberRecord | null;

  const targetUserData = await getUserInfoById(params.newOwnerId);
  const ownerUserData = await getUserInfoById(params.currentOwnerId);

  await createAuditLog({
    team_id: params.teamId,
    user_id: params.currentOwnerId,
    action: 'ownership.transfer',
    target_type: 'team',
    target_id: params.teamId,
    old_value: {
      owner_id: params.currentOwnerId,
      owner_username: ownerUserData?.username,
      owner_email: ownerUserData?.email,
    },
    new_value: {
      owner_id: params.newOwnerId,
      owner_username: targetUserData?.username,
      owner_email: targetUserData?.email,
      old_owner_new_role: 'admin',
    },
    ip_address: params.clientInfo.ip_address,
    user_agent: params.clientInfo.user_agent,
  });

  return {
    old_owner: buildTeamMemberResponse(
      {
        id: updatedOwnerMember?.id || currentOwnerMember.id,
        team_id: params.teamId,
        user_id: params.currentOwnerId,
        role: 'admin',
        status: updatedOwnerMember?.status || currentOwnerMember.status,
        joined_at: updatedOwnerMember?.joined_at || currentOwnerMember.joined_at,
        updated_at: updatedOwnerMember?.updated_at || currentOwnerMember.updated_at,
      },
      ownerUserData
    ),
    new_owner: buildTeamMemberResponse(
      {
        id: updatedTargetMember?.id || targetMember.id,
        team_id: params.teamId,
        user_id: params.newOwnerId,
        role: 'owner',
        status: updatedTargetMember?.status || targetMember.status,
        joined_at: updatedTargetMember?.joined_at || targetMember.joined_at,
        updated_at: updatedTargetMember?.updated_at || targetMember.updated_at,
      },
      targetUserData
    ),
  };
}
