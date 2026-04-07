import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess, canInviteRole } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { fail, ok } from '@/server/api/responses';
import {
  createTeamInvitation,
  listTeamInvitations,
} from '@/services/team/team-invitation.service';
import { sendTeamInvitationEmail } from '@/services/team/team-invitation-email.service';
import {
  ErrorCode,
  type InviteMemberRequest,
  type TeamInvitationListResponse,
  type CreateTeamInvitationResponse,
  type TeamInvitationQuery,
  type TeamRole,
} from '@ai-gateway/shared-types/team';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidInviteRole(role: string): role is Exclude<TeamRole, 'owner'> {
  return role === 'admin' || role === 'member' || role === 'guest';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TeamInvitationListResponse>> {
  try {
    const { id: teamId } = await params;
    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);

    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const query: TeamInvitationQuery = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      status: (searchParams.get('status') as TeamInvitationQuery['status']) || undefined,
    };

    const result = await listTeamInvitations(teamId, query);
    return ok(result);
  } catch (error) {
    console.error('获取团队邀请异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CreateTeamInvitationResponse>> {
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

    if (!body.email || !isValidEmail(body.email)) {
      return fail('邮箱格式无效', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    if (!body.role || !isValidInviteRole(body.role)) {
      return fail('无效的角色类型，只能邀请 admin、member 或 guest', 400, {
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    if (!canInviteRole(authResult.role!, body.role)) {
      return fail('Admin 只能邀请 member 或 guest 角色的成员', 403, {
        code: ErrorCode.FORBIDDEN,
      });
    }

    const invitation = await createTeamInvitation({
      teamId,
      inviterUserId: authResult.user!.id,
      email: body.email,
      role: body.role,
      inviteBaseUrl: process.env.NEXTAUTH_URL || request.nextUrl.origin,
      clientInfo: getClientInfo(request),
    });

    if (invitation.invite_url) {
      try {
        await sendTeamInvitationEmail({
          invitation,
          inviterName: authResult.user?.name || authResult.user?.email || undefined,
        });
      } catch (emailError) {
        console.warn('发送邀请邮件失败:', emailError);
      }
    }

    return ok(invitation, { status: 201 });
  } catch (error) {
    console.error('创建团队邀请异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';

    if (message === '团队不存在') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }
    if (message === '该用户已是团队成员' || message === '该邮箱已有待处理邀请') {
      return fail(message, 409, { code: ErrorCode.CONFLICT });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}
