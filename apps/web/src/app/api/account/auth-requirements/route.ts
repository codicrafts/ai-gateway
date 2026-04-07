import { getAppUserByEmail, getAppUserByPhone } from '@/services/account/app-user.service';
import { getTwoFactorRequirementsForIdentifier } from '@/services/account/two-factor.service';
import { isPhoneIdentifier, validateEmail } from '@/utils/helpers';
import { normalizePhoneForAuth } from '@/services/account/phone-auth.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) {
      return fail('账号不能为空', 400);
    }

    const isPhone = isPhoneIdentifier(identifier);
    const isEmail = validateEmail(identifier);

    if (!isPhone && !isEmail) {
      return fail('请输入有效的邮箱地址或中国大陆手机号', 400);
    }

    const user = isPhone
      ? await getAppUserByPhone(identifier)
      : isEmail
        ? await getAppUserByEmail(identifier)
        : null;

    const hasPassword = Boolean(user?.password_hash);
    const requirements =
      user && hasPassword
        ? await getTwoFactorRequirementsForIdentifier({
            phone: isPhone ? normalizePhoneForAuth(identifier) : null,
            email: isEmail ? identifier.trim().toLowerCase() : null,
          })
        : { requiresTwoFactor: false, recoveryCodesRemaining: 0 };

    return ok({
      identifierType: isPhone ? 'phone' : 'email',
      accountExists: Boolean(user),
      hasPassword,
      availableMethods: hasPassword ? ['code', 'password'] : ['code'],
      recommendedMethod: 'code',
      ...requirements,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '获取认证要求失败', 400);
  }
}
