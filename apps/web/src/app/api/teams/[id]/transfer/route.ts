/**
 * 所有权转让 API
 * 
 * POST /api/teams/[id]/transfer - 转让所有权
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { transferTeamOwnership } from '@/services/team/team-mutation.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type TransferOwnershipRequest,
  type TransferOwnershipResponse,
} from '@ai-gateway/shared-types/team';

/**
 * POST /api/teams/[id]/transfer
 * 转让所有权
 * 
 * 验证：用户必须是 Owner
 * 请求体：TransferOwnershipRequest（new_owner_id）
 * 验证：
 *   - 目标用户必须是团队成员
 *   - 目标用户不能是当前 Owner
 * 原子性操作：
 *   - 将目标成员设置为 Owner
 *   - 将原 Owner 降级为 Admin
 * 更新 teams 表的 owner_id
 * 记录审计日志（ownership.transfer）
 * 返回：TransferOwnershipResponse
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TransferOwnershipResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId, ['owner']);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    let body: TransferOwnershipRequest;
    try {
      body = await request.json();
    } catch {
      return fail('请求体格式错误', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const { new_owner_id } = body;

    if (!new_owner_id || typeof new_owner_id !== 'string') {
      return fail('请提供新 Owner 的用户 ID', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const result = await transferTeamOwnership({
      teamId,
      currentOwnerId: authResult.user!.id,
      newOwnerId: new_owner_id,
      clientInfo: getClientInfo(request),
    });

    return ok(result);
  } catch (error) {
    console.error('转让所有权异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    if (
      message === '不能将所有权转让给自己' ||
      message === '目标用户不是活跃的团队成员'
    ) {
      return fail(message, 400, { code: ErrorCode.VALIDATION_ERROR });
    }
    if (message === '目标用户不是团队成员') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}
