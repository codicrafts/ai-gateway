import type { NextRequest } from 'next/server';
import { createAuditLog, getClientInfo } from '@/lib/auditLog';
import { checkTeamMember } from '@/lib/teamAuth';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getAppUserById, sanitizeAppUser } from '@/services/account/app-user.service';
import { disableTwoFactor } from '@/services/account/two-factor.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: NextRequest) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const teamId = typeof body.team_id === 'string' ? body.team_id : null;
    const before = await getAppUserById(appUser.id);
    await disableTwoFactor(appUser.id, {
      totpCode: typeof body.code === 'string' ? body.code : null,
      recoveryCode: typeof body.recoveryCode === 'string' ? body.recoveryCode : null,
    });
    const user = await getAppUserById(appUser.id);

    if (teamId) {
      const teamRole = await checkTeamMember(teamId, appUser.id);
      if (teamRole) {
        await createAuditLog({
          team_id: teamId,
          user_id: appUser.id,
          action: 'security.2fa_disable',
          target_type: 'user',
          target_id: appUser.id,
          old_value: {
            two_factor_enabled: before?.two_factor_enabled || false,
            two_factor_enabled_at: before?.two_factor_enabled_at || null,
          },
          new_value: {
            two_factor_enabled: false,
            two_factor_enabled_at: null,
          },
          ...getClientInfo(request),
        });
      }
    }

    return ok({ disabled: true, user: user ? sanitizeAppUser(user) : null });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '关闭双因素认证失败', 400);
  }
}
