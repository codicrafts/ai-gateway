import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { cancelTeamInvitation } from '@/services/team/team-invitation.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type CancelTeamInvitationResponse,
} from '@ai-gateway/shared-types/team';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
): Promise<NextResponse<CancelTeamInvitationResponse>> {
  try {
    const { id: teamId, invitationId } = await params;
    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);

    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const result = await cancelTeamInvitation({
      teamId,
      invitationId,
      operatorUserId: authResult.user!.id,
      clientInfo: getClientInfo(request),
    });

    return ok(result);
  } catch (error) {
    console.error('取消团队邀请异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';

    if (message === '邀请不存在') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }
    if (message === '只能取消待处理邀请') {
      return fail(message, 409, { code: ErrorCode.CONFLICT });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}
