import type { NextRequest } from 'next/server';
import { createAuditLog, getClientInfo } from '@/lib/auditLog';
import { checkTeamMember } from '@/lib/teamAuth';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getAppUserById, sanitizeAppUser } from '@/services/account/app-user.service';
import { enableTwoFactor } from '@/services/account/two-factor.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: NextRequest) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code : '';
    const teamId = typeof body.team_id === 'string' ? body.team_id : null;
    const payload = await enableTwoFactor(appUser.id, code);
    const user = await getAppUserById(appUser.id);

    if (teamId) {
      const teamRole = await checkTeamMember(teamId, appUser.id);
      if (teamRole) {
        await createAuditLog({
          team_id: teamId,
          user_id: appUser.id,
          action: 'security.2fa_enable',
          target_type: 'user',
          target_id: appUser.id,
          new_value: {
            two_factor_enabled: true,
            two_factor_enabled_at: user?.two_factor_enabled_at || new Date().toISOString(),
          },
          ...getClientInfo(request),
        });
      }
    }

    return ok({
      recoveryCodes: payload.recoveryCodes,
      user: user ? sanitizeAppUser(user) : null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '启用双因素认证失败', 400);
  }
}
