import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { beginPasskeyRegistration } from '@/services/account/passkey.service';
import { fail, ok } from '@/server/api/responses';

export async function POST() {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const options = await beginPasskeyRegistration(appUser.id);
    return ok({ options });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '初始化 Passkey 失败', 400);
  }
}
