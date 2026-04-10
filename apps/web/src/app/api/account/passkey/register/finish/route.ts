import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { finishPasskeyRegistration } from '@/services/account/passkey.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    await finishPasskeyRegistration(appUser.id, body);
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '完成 Passkey 注册失败', 400);
  }
}
