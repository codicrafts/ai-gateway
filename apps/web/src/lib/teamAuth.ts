/**
 * 团队权限验证中间件
 * 
 * 实现基于角色的访问控制（RBAC），确保权限隔离
 * 
 * 权限矩阵：
 * - Owner: 所有权限
 * - Admin: 更新团队、邀请/移除 Member/Guest、修改为 Member/Guest、查看/导出审计日志
 * - Member: 查看团队、查看成员、退出团队
 * - Guest: 查看团队、查看成员、退出团队
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { createServerSupabaseClient } from './supabase';
import type { TeamRole, PermissionAction } from '@ai-gateway/shared-types/team';

/**
 * 角色权限映射表
 * 定义每个角色可执行的操作
 */
const ROLE_PERMISSIONS: Record<TeamRole, PermissionAction[]> = {
  owner: [
    'team.view',
    'team.update',
    'team.delete',
    'member.view',
    'member.invite',
    'member.remove',
    'member.role_change',
    'ownership.transfer',
    'audit.view',
    'audit.export',
  ],
  admin: [
    'team.view',
    'team.update',
    'member.view',
    'member.invite',
    'member.remove',
    'member.role_change',
    'audit.view',
    'audit.export',
  ],
  member: [
    'team.view',
    'member.view',
  ],
  guest: [
    'team.view',
    'member.view',
  ],
};

/**
 * 角色层级定义（数值越大权限越高）
 */
const ROLE_HIERARCHY: Record<TeamRole, number> = {
  guest: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * 用户信息接口
 */
export interface CurrentUser {
  id: string;
  email: string | null;
  name?: string | null;
}

/**
 * 权限检查结果接口
 */
export interface AuthResult {
  success: boolean;
  error?: string;
  code?: number;
  user?: CurrentUser;
  role?: TeamRole;
}

/**
 * 从 NextAuth session 获取当前用户
 * 
 * @returns 当前用户信息或 null
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }

    const supabase = createServerSupabaseClient();
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', session.user.id)
      .single() as { data: { id: string; email: string | null; username: string } | null; error: unknown };

    if (error || !userData) {
      return {
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.name,
      };
    }

    return {
      id: userData.id,
      email: userData.email,
      name: userData.username || session.user.name,
    };
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 检查用户是否是团队成员
 * 
 * @param teamId - 团队 ID
 * @param userId - 用户 ID
 * @returns 成员角色或 null（如果不是成员）
 */
export async function checkTeamMember(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: member, error } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single() as { data: { role: TeamRole; status: string } | null; error: unknown };

    if (error || !member) {
      return null;
    }

    // 只有活跃状态的成员才算有效成员
    if (member.status !== 'active') {
      return null;
    }

    return member.role;
  } catch (error) {
    console.error('检查团队成员失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有指定角色（或更高权限）
 * 
 * @param teamId - 团队 ID
 * @param userId - 用户 ID
 * @param requiredRoles - 允许的角色列表
 * @returns 权限检查结果
 */
export async function checkTeamRole(
  teamId: string,
  userId: string,
  requiredRoles: TeamRole[]
): Promise<AuthResult> {
  const role = await checkTeamMember(teamId, userId);

  if (!role) {
    return {
      success: false,
      error: '您不是该团队的成员',
      code: 403,
    };
  }

  if (!requiredRoles.includes(role)) {
    return {
      success: false,
      error: '权限不足',
      code: 403,
      role,
    };
  }

  return {
    success: true,
    role,
  };
}

/**
 * 检查用户是否有执行特定操作的权限
 * 
 * @param role - 用户角色
 * @param action - 要执行的操作
 * @returns 是否有权限
 */
export function hasPermission(role: TeamRole, action: PermissionAction): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

/**
 * 检查邀请权限分层
 * Owner 可以邀请任意角色（admin/member/guest）
 * Admin 只能邀请 member 或 guest
 * 
 * @param inviterRole - 邀请者角色
 * @param targetRole - 目标角色
 * @returns 是否允许邀请
 */
export function canInviteRole(
  inviterRole: TeamRole,
  targetRole: TeamRole
): boolean {
  // Owner 不能被邀请
  if (targetRole === 'owner') {
    return false;
  }

  // Owner 可以邀请任意非 Owner 角色
  if (inviterRole === 'owner') {
    return true;
  }

  // Admin 只能邀请 member 或 guest
  if (inviterRole === 'admin') {
    return targetRole === 'member' || targetRole === 'guest';
  }

  // Member 和 Guest 不能邀请
  return false;
}

/**
 * 检查角色修改权限分层
 * Owner 可以将成员修改为任意非 Owner 角色
 * Admin 只能将成员修改为 member 或 guest
 * 不能修改 Owner 的角色
 * 
 * @param modifierRole - 修改者角色
 * @param targetRole - 被修改者当前角色
 * @param newRole - 新角色
 * @returns 是否允许修改
 */
export function canModifyRole(
  modifierRole: TeamRole,
  targetRole: TeamRole,
  newRole: TeamRole
): boolean {
  // 不能修改 Owner 的角色
  if (targetRole === 'owner') {
    return false;
  }

  // 不能将任何人设置为 Owner（所有权只能通过转让）
  if (newRole === 'owner') {
    return false;
  }

  // Owner 可以修改任意非 Owner 成员为任意非 Owner 角色
  if (modifierRole === 'owner') {
    return true;
  }

  // Admin 只能修改 member/guest 为 member/guest
  if (modifierRole === 'admin') {
    // Admin 不能修改其他 Admin
    if (targetRole === 'admin') {
      return false;
    }
    // Admin 只能设置为 member 或 guest
    return newRole === 'member' || newRole === 'guest';
  }

  // Member 和 Guest 不能修改角色
  return false;
}

/**
 * 检查移除权限分层
 * Owner 可以移除任意非 Owner 成员
 * Admin 只能移除 member 或 guest
 * 不能移除 Owner
 * 
 * @param removerRole - 移除者角色
 * @param targetRole - 被移除者角色
 * @returns 是否允许移除
 */
export function canRemoveMember(
  removerRole: TeamRole,
  targetRole: TeamRole
): boolean {
  // 不能移除 Owner
  if (targetRole === 'owner') {
    return false;
  }

  // Owner 可以移除任意非 Owner 成员
  if (removerRole === 'owner') {
    return true;
  }

  // Admin 只能移除 member 或 guest
  if (removerRole === 'admin') {
    return targetRole === 'member' || targetRole === 'guest';
  }

  // Member 和 Guest 不能移除其他成员
  return false;
}

/**
 * 检查用户是否可以自主退出团队
 * Owner 不能退出（需先转让所有权）
 * 其他角色可以自主退出
 * 
 * @param role - 用户角色
 * @returns 是否可以退出
 */
export function canLeaveTeam(role: TeamRole): boolean {
  return role !== 'owner';
}

/**
 * 检查用户是否可以转让所有权
 * 只有 Owner 可以转让
 * 
 * @param role - 用户角色
 * @returns 是否可以转让
 */
export function canTransferOwnership(role: TeamRole): boolean {
  return role === 'owner';
}

/**
 * 比较两个角色的权限层级
 * 
 * @param role1 - 角色1
 * @param role2 - 角色2
 * @returns 正数表示 role1 权限更高，负数表示 role2 权限更高，0 表示相同
 */
export function compareRoles(role1: TeamRole, role2: TeamRole): number {
  return ROLE_HIERARCHY[role1] - ROLE_HIERARCHY[role2];
}

/**
 * 验证用户认证状态和团队成员身份的组合检查
 * 
 * @param teamId - 团队 ID
 * @param requiredRoles - 可选，要求的角色列表
 * @returns 权限检查结果
 */
export async function verifyTeamAccess(
  teamId: string,
  requiredRoles?: TeamRole[]
): Promise<AuthResult> {
  // 1. 验证用户登录状态
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: '请先登录',
      code: 401,
    };
  }

  // 2. 验证团队成员身份
  const role = await checkTeamMember(teamId, user.id);
  if (!role) {
    return {
      success: false,
      error: '您不是该团队的成员',
      code: 403,
      user,
    };
  }

  // 3. 如果指定了角色要求，验证角色
  if (requiredRoles && !requiredRoles.includes(role)) {
    return {
      success: false,
      error: '权限不足',
      code: 403,
      user,
      role,
    };
  }

  return {
    success: true,
    user,
    role,
  };
}

/**
 * 获取用户在团队中的完整权限列表
 * 
 * @param role - 用户角色
 * @returns 权限操作列表
 */
export function getUserPermissions(role: TeamRole): PermissionAction[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * 权限错误消息映射
 */
export const PermissionErrors: Record<string, string> = {
  'team.update': '只有 Owner 或 Admin 可以更新团队信息',
  'team.delete': '只有 Owner 可以删除团队',
  'member.invite': '只有 Owner 或 Admin 可以邀请成员',
  'member.remove': '只有 Owner 或 Admin 可以移除成员',
  'member.role_change': '只有 Owner 或 Admin 可以修改成员角色',
  'ownership.transfer': '只有 Owner 可以转让所有权',
  'audit.view': '只有 Owner 或 Admin 可以查看审计日志',
  'audit.export': '只有 Owner 或 Admin 可以导出审计日志',
};

/**
 * 获取权限错误消息
 * 
 * @param action - 操作类型
 * @returns 错误消息
 */
export function getPermissionError(action: PermissionAction): string {
  return PermissionErrors[action] || '权限不足';
}
