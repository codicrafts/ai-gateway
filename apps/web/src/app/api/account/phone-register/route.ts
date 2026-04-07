import { NextRequest, NextResponse } from 'next/server';
import { createLocalUser } from '@/services/account/app-user.service';
import { verifyPhoneVerificationCode } from '@/services/account/phone-auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!phone || !code || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields', code: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    await verifyPhoneVerificationCode(phone, 'register', code);

    const user = await createLocalUser({
      username,
      phone,
      email: email || null,
      password,
      balance: 5.0,
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Phone register failed';
    const codeMap: Record<string, { code: string; status: number }> = {
      验证码无效或已过期: { code: 'CODE_EXPIRED', status: 400 },
      验证码错误: { code: 'CODE_INVALID', status: 400 },
      手机号已存在: { code: 'PHONE_ALREADY_EXISTS', status: 400 },
      邮箱已存在: { code: 'EMAIL_ALREADY_EXISTS', status: 400 },
      请提供邮箱或手机号: { code: 'IDENTIFIER_REQUIRED', status: 400 },
    };
    const mapped = codeMap[message] ?? { code: 'PHONE_REGISTER_FAILED', status: 500 };
    return NextResponse.json({ error: message, code: mapped.code }, { status: mapped.status });
  }
}
