/**
 * 成员角色更新和移除 API
 * 
 * PUT /api/teams/[id]/members/[userId] - 更新成员角色
 * DELETE /api/teams/[id]/members/[userId] - 移除成员
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import {
  isValidInviteRole,
  removeTeamMember,
  updateTeamMemberRole,
} from '@/services/team/team-mutation.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type UpdateMemberRoleRequest,
  type UpdateMemberRoleResponse,
  type RemoveMemberResponse,
} from '@ai-gateway/shared-types/team';

/**
 * PUT /api/teams/[id]/members/[userId]
 * 更新成员角色
 * 
 * 验证：用户必须是 Owner 或 Admin
 * 请求体：UpdateMemberRoleRequest（role）
 * 验证：
 *   - 不能修改 Owner 的角色
 *   - 不能将任何人设置为 Owner（所有权只能通过转让）
 *   - 权限分层（Owner 可修改任意非 Owner 成员，Admin 只能修改 member/guest 为 member/guest）
 * 记录审计日志（member.role_change）
 * 返回：UpdateMemberRoleResponse
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse<UpdateMemberRoleResponse>> {
  try {
    const { id: teamId, userId: targetUserId } = await params;

    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    let body: UpdateMemberRoleRequest;
    try {
      body = await request.json();
    } catch {
      return fail('请求体格式错误', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const { role: newRole } = body;

    if (!newRole || !isValidInviteRole(newRole)) {
      return fail('无效的角色类型，只能设置为 admin、member 或 guest', 400, {
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    const member = await updateTeamMemberRole({
      teamId,
      targetUserId,
      operatorUserId: authResult.user!.id,
      operatorRole: authResult.role!,
      newRole,
      clientInfo: getClientInfo(request),
    });

    return ok(member);
  } catch (error) {
    console.error('更新成员角色异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    if (message === '成员不存在') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }
    if (
      message === '不能修改 Owner 的角色' ||
      message === 'Admin 不能修改其他 Admin 的角色' ||
      message === 'Admin 只能将成员设置为 member 或 guest' ||
      message === '权限不足，无法修改该成员的角色'
    ) {
      return fail(message, 403, { code: ErrorCode.FORBIDDEN });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}


/**
 * DELETE /api/teams/[id]/members/[userId]
 * 移除成员
 * 
 * 验证：用户必须是 Owner 或 Admin，或者是自己退出
 * 验证：
 *   - 不能移除 Owner
 *   - 权限分层（Owner 可移除任意非 Owner 成员，Admin 只能移除 member/guest）
 *   - 成员可以自主退出（非 Owner）
 * 记录审计日志（member.remove）
 * 返回：RemoveMemberResponse
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse<RemoveMemberResponse>> {
  try {
    const { id: teamId, userId: targetUserId } = await params;

    const authResult = await verifyTeamAccess(teamId);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const result = await removeTeamMember({
      teamId,
      targetUserId,
      operatorUserId: authResult.user!.id,
      operatorRole: authResult.role!,
      clientInfo: getClientInfo(request),
    });

    return ok(result);
  } catch (error) {
    console.error('移除成员异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    if (message === '成员不存在') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }
    if (
      message === 'Owner 不能退出团队，请先转让所有权' ||
      message === '只有 Owner 或 Admin 可以移除成员' ||
      message === '不能移除 Owner' ||
      message === 'Admin 不能移除其他 Admin' ||
      message === '权限不足，无法移除该成员'
    ) {
      return fail(message, 403, { code: ErrorCode.FORBIDDEN });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}
