import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { beginTwoFactorSetup } from '@/services/account/two-factor.service';
import { fail, ok } from '@/server/api/responses';

export async function POST() {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const payload = await beginTwoFactorSetup(appUser.id);
    return ok(payload);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '初始化双因素认证失败', 400);
  }
}
