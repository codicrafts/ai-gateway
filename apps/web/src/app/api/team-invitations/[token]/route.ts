import { NextResponse } from 'next/server';
import { fail, ok } from '@/server/api/responses';
import { getTeamInvitationByToken } from '@/services/team/team-invitation.service';
import {
  ErrorCode,
  type TeamInvitationDetailResponse,
} from '@ai-gateway/shared-types/team';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<TeamInvitationDetailResponse>> {
  try {
    const { token } = await params;
    const invitation = await getTeamInvitationByToken(token);

    if (!invitation) {
      return fail('邀请不存在或已失效', 404, { code: ErrorCode.NOT_FOUND });
    }

    return ok(invitation);
  } catch (error) {
    console.error('获取邀请详情异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}
