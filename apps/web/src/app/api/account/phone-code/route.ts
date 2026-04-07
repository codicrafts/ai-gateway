import { NextRequest, NextResponse } from 'next/server';
import { getAppUserByPhone } from '@/services/account/app-user.service';
import { issuePhoneVerificationCode, type PhoneVerificationPurpose } from '@/services/account/phone-auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const purpose = (typeof body.purpose === 'string' ? body.purpose : 'register') as PhoneVerificationPurpose;

    if (!['register', 'login', 'bind_phone', 'reset_password', 'auth'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose', code: 'INVALID_PURPOSE' }, { status: 400 });
    }

    const existing = await getAppUserByPhone(phone);
    if (purpose === 'register' && existing) {
      return NextResponse.json({ error: 'Phone already exists', code: 'PHONE_ALREADY_EXISTS' }, { status: 400 });
    }

    if (purpose === 'login' && !existing) {
      return NextResponse.json({ error: 'Phone not found', code: 'PHONE_NOT_FOUND' }, { status: 404 });
    }

    const result = await issuePhoneVerificationCode(phone, purpose);

    return NextResponse.json({
      success: true,
      data: {
        expiresAt: result.expiresAt,
        debugCode: result.debugCode,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send code';
    return NextResponse.json(
      {
        error: message,
        code: message.includes('手机号') ? 'INVALID_PHONE' : 'PHONE_CODE_FAILED',
      },
      { status: 400 },
    );
  }
}
