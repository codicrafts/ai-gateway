import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getBillingSummaryForTeam } from '@/services/billing/billing.service';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const teamId = new URL(request.url).searchParams.get('team_id');
    const teamContext = await resolveAccessibleTeamContext(appUser.id, teamId);
    const summary = await getBillingSummaryForTeam(teamContext.teamId);
    return ok(summary);
  } catch (error) {
    console.error('获取账单摘要异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}
