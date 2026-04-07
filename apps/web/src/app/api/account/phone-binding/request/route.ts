import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { requestPhoneBindingCode } from '@/services/account/phone-binding.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const result = await requestPhoneBindingCode(appUser.id, phone);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '发送验证码失败', 400);
  }
}
