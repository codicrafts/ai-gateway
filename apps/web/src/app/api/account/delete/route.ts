import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { deleteAppUserAccount } from '@/services/account/app-user.service';
import { fail, ok } from '@/server/api/responses';

export async function POST() {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    await deleteAppUserAccount(appUser.id);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '删除账户失败', 400);
  }
}
