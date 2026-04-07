import { NextRequest } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { reviewTeamJoinApplication } from '@/services/team/team-join-application.service';
import { fail, ok } from '@/server/api/responses';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  const { id: teamId, applicationId } = await params;
  const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
  if (!authResult.success) {
    return fail(authResult.error || '权限验证失败', authResult.code || 403);
  }

  try {
    const body = await request.json();
    const decision = body.decision === 'approve' ? 'approve' : body.decision === 'reject' ? 'reject' : null;
    if (!decision) {
      return fail('无效的处理结果', 400);
    }

    const application = await reviewTeamJoinApplication({
      teamId,
      applicationId,
      reviewerUserId: authResult.user!.id,
      decision,
      clientInfo: getClientInfo(request),
    });
    return ok(application);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '处理团队申请失败', 400);
  }
}
