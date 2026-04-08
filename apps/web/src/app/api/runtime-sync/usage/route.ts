import { fail, ok } from '@/server/api/responses';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { synchronizeTeamUsageLedgerNow } from '@/services/runtime-sync/org-runtime-sync.service';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const body = (await request.json().catch(() => null)) as { team_id?: string | null } | null;
    const teamContext = await resolveAccessibleTeamContext(appUser.id, body?.team_id || null);

    await synchronizeTeamUsageLedgerNow(teamContext.teamId);

    return ok({
      team_id: teamContext.teamId,
      synced: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '组织用量同步失败';
    return fail(message, 500);
  }
}
