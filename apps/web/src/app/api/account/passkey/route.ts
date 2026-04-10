import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { deletePasskey, getPasskeyStatus } from '@/services/account/passkey.service';
import { fail, ok } from '@/server/api/responses';

export async function GET() {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const status = await getPasskeyStatus(appUser.id);
    return ok(status);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '获取 Passkey 状态失败', 400);
  }
}

export async function DELETE() {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    await deletePasskey(appUser.id);
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '解绑 Passkey 失败', 400);
  }
}
