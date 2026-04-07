import type { NextRequest } from 'next/server';
import { createAuditLog, getClientInfo } from '@/lib/auditLog';
import { checkTeamMember } from '@/lib/teamAuth';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { confirmPhoneBindingCode } from '@/services/account/phone-binding.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: NextRequest) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const teamId = typeof body.team_id === 'string' ? body.team_id : null;
    const user = await confirmPhoneBindingCode({
      userId: appUser.id,
      phone,
      code,
    });

    if (teamId) {
      const teamRole = await checkTeamMember(teamId, appUser.id);
      if (teamRole) {
        await createAuditLog({
          team_id: teamId,
          user_id: appUser.id,
          action: 'security.phone_bind',
          target_type: 'user',
          target_id: appUser.id,
          new_value: {
            phone: user.phone,
            phone_verified_at: user.phone_verified_at,
          },
          ...getClientInfo(request),
        });
      }
    }

    return ok(user);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '绑定手机号失败', 400);
  }
}
