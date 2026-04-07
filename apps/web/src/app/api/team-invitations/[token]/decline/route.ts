import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { fail, ok } from '@/server/api/responses';
import { respondToTeamInvitation } from '@/services/team/team-invitation.service';
import {
  ErrorCode,
  type RespondTeamInvitationResponse,
} from '@ai-gateway/shared-types/team';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<RespondTeamInvitationResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('请先登录', 401, { code: ErrorCode.UNAUTHORIZED });
    }

    const { token } = await params;
    const result = await respondToTeamInvitation({
      token,
      action: 'decline',
      userId: user.id,
      clientInfo: getClientInfo(request),
    });

    return ok({
      invitation: result.invitation,
      team_id: result.teamId,
    });
  } catch (error) {
    console.error('拒绝团队邀请异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    const status =
      message === '请先登录' ? 401 :
      message === '邀请不存在或已失效' ? 404 :
      message === '当前账号与邀请邮箱不匹配' ? 403 :
      message === '邀请已处理或已过期' || message === '邀请已过期' ? 409 :
      500;

    return fail(message, status, {
      code:
        status === 401 ? ErrorCode.UNAUTHORIZED :
        status === 403 ? ErrorCode.FORBIDDEN :
        status === 404 ? ErrorCode.NOT_FOUND :
        status === 409 ? ErrorCode.CONFLICT :
        ErrorCode.INTERNAL_ERROR,
    });
  }
}
