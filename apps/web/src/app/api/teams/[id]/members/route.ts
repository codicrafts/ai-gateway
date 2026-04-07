/**
 * 团队成员列表和邀请 API
 * 
 * GET /api/teams/[id]/members - 获取成员列表
 * POST /api/teams/[id]/members - 邀请新成员
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess, canInviteRole } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { listTeamMembers } from '@/services/team/team-query.service';
import {
  inviteTeamMember,
  isValidEmail,
  isValidInviteRole,
} from '@/services/team/team-mutation.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type MemberListResponse,
  type InviteMemberRequest,
  type InviteMemberResponse,
  type TeamRole,
} from '@ai-gateway/shared-types/team';

/**
 * GET /api/teams/[id]/members
 * 获取成员列表
 * 
 * 验证：用户必须是团队成员
 * 查询参数：page、limit、role（角色筛选）、search（搜索用户名/邮箱）
 * 返回：MemberListResponse（包含用户信息）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<MemberListResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get('role') as TeamRole | null;
    const searchQuery = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const result = await listTeamMembers(teamId, {
      page,
      limit,
      role: roleFilter || undefined,
      search: searchQuery || undefined,
    });

    return ok(result);
  } catch (error) {
    console.error('获取成员列表异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}

/**
 * POST /api/teams/[id]/members
 * 邀请新成员
 * 
 * 验证：用户必须是 Owner 或 Admin
 * 请求体：InviteMemberRequest（email, role）
 * 验证：
 *   - 邮箱格式有效
 *   - 用户存在于系统中
 *   - 用户不是已有成员
 *   - 邀请权限分层（Owner 可邀请任意角色，Admin 只能邀请 member/guest）
 * 记录审计日志（member.invite）
 * 返回：InviteMemberResponse
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<InviteMemberResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    let body: InviteMemberRequest;
    try {
      body = await request.json();
    } catch {
      return fail('请求体格式错误', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const { email, role } = body;

    if (!email || !isValidEmail(email)) {
      return fail('邮箱格式无效', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    if (!role || !isValidInviteRole(role)) {
      return fail('无效的角色类型，只能邀请 admin、member 或 guest', 400, {
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    if (!canInviteRole(authResult.role!, role)) {
      return fail('Admin 只能邀请 member 或 guest 角色的成员', 403, {
        code: ErrorCode.FORBIDDEN,
      });
    }

    const member = await inviteTeamMember({
      teamId,
      inviterUserId: authResult.user!.id,
      email,
      role,
      clientInfo: getClientInfo(request),
    });

    return ok(member, { status: 201 });
  } catch (error) {
    console.error('邀请成员异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';

    if (message === '用户不存在，请确认邮箱地址正确') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }

    if (message === '该用户已是团队成员') {
      return fail(message, 409, { code: ErrorCode.CONFLICT });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}
