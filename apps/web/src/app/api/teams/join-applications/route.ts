import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import {
  createTeamJoinApplication,
  listUserJoinApplications,
} from '@/services/team/team-join-application.service';
import { fail, ok } from '@/server/api/responses';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return fail('请先登录', 401);
  }

  try {
    const applications = await listUserJoinApplications(user.id);
    return ok(applications);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '获取申请记录失败', 400);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const requestedRole = body.requested_role === 'guest' ? 'guest' : 'member';
    const message = typeof body.message === 'string' ? body.message : undefined;
    const application = await createTeamJoinApplication({
      applicantUserId: user.id,
      slug,
      requestedRole,
      message,
      clientInfo: getClientInfo(request),
    });
    return ok(application, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '提交加入申请失败', 400);
  }
}
