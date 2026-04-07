import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { fail, ok } from '@/server/api/responses';
import { changeLocalUserPassword } from '@/services/account/app-user.service';

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const nextPassword = typeof body.nextPassword === 'string' ? body.nextPassword : '';

    if (!currentPassword || !nextPassword) {
      return fail('缺少密码参数', 400);
    }

    if (nextPassword.length < 6) {
      return fail('新密码至少需要 6 位', 400);
    }

    const updatedUser = await changeLocalUserPassword({
      userId: appUser.id,
      currentPassword,
      nextPassword,
    });

    return ok(updatedUser);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '修改密码失败', 400);
  }
}
