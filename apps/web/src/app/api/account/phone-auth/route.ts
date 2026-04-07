import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateLocalUser,
  createLocalUser,
  getAppUserByPhone,
} from '@/services/account/app-user.service';
import { normalizePhoneForAuth, verifyPhoneVerificationCode } from '@/services/account/phone-auth.service';

function buildDefaultUsername(phone: string): string {
  return `user_${phone.slice(-4)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    if (!phone || !code || !password) {
      return NextResponse.json({ error: 'Missing required fields', code: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    await verifyPhoneVerificationCode(phone, 'auth', code);

    const existing = await getAppUserByPhone(phone);
    if (existing) {
      const authenticated = await authenticateLocalUser(phone, password);
      if (!authenticated) {
        return NextResponse.json(
          { error: '密码不正确，请确认后重试', code: 'PHONE_PASSWORD_MISMATCH' },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, data: authenticated, mode: 'login' });
    }

    const normalizedPhone = normalizePhoneForAuth(phone);
    const user = await createLocalUser({
      username: username || buildDefaultUsername(normalizedPhone),
      phone: normalizedPhone,
      password,
      balance: 5.0,
    });

    return NextResponse.json({ success: true, data: user, mode: 'register' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Phone auth failed';
    const codeMap: Record<string, { code: string; status: number }> = {
      验证码无效或已过期: { code: 'CODE_EXPIRED', status: 400 },
      验证码错误: { code: 'CODE_INVALID', status: 400 },
      请提供邮箱或手机号: { code: 'IDENTIFIER_REQUIRED', status: 400 },
    };
    const mapped = codeMap[message] ?? { code: 'PHONE_AUTH_FAILED', status: 500 };
    return NextResponse.json({ error: message, code: mapped.code }, { status: mapped.status });
  }
}
