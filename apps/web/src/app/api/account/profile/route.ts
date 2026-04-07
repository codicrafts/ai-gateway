import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { fail, ok } from '@/server/api/responses';
import { updateAppUserProfile } from '@/services/account/app-user.service';

export async function PATCH(request: Request) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const updatedUser = await updateAppUserProfile(appUser.id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      image: typeof body.image === 'string' ? body.image : undefined,
    });

    return ok(updatedUser);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '更新个人资料失败', 400);
  }
}
