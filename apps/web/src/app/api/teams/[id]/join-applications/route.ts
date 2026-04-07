import { NextRequest } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { listTeamJoinApplications } from '@/services/team/team-join-application.service';
import { fail, ok } from '@/server/api/responses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
  if (!authResult.success) {
    return fail(authResult.error || '权限验证失败', authResult.code || 403);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
    const result = await listTeamJoinApplications({
      teamId,
      page,
      limit,
      status: status || undefined,
    });
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '获取团队申请失败', 400);
  }
}
