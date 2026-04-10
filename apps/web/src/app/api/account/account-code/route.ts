import { NextRequest, NextResponse } from 'next/server';
import { issueEmailVerificationCode } from '@/services/account/email-auth.service';
import { issuePhoneVerificationCode } from '@/services/account/phone-auth.service';
import { isPhoneIdentifier, validateEmail } from '@/utils/helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) {
      return NextResponse.json({ error: 'Missing identifier', code: 'MISSING_IDENTIFIER' }, { status: 400 });
    }

    const result = isPhoneIdentifier(identifier)
      ? await issuePhoneVerificationCode(identifier, 'auth')
      : validateEmail(identifier)
        ? await issueEmailVerificationCode(identifier, 'auth')
        : null;

    if (!result) {
      return NextResponse.json({ error: 'Invalid account identifier', code: 'INVALID_IDENTIFIER' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        expiresAt: result.expiresAt,
        debugCode: result.debugCode,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send code';
    const status =
      message === '短信服务未配置'
        ? 500
        : message.startsWith('短信发送失败')
          ? 502
          : 400;
    const code =
      message === '短信服务未配置'
        ? 'SMS_NOT_CONFIGURED'
        : message.startsWith('短信发送失败')
          ? 'SMS_DELIVERY_FAILED'
          : 'ACCOUNT_CODE_FAILED';
    return NextResponse.json({ error: message, code }, { status });
  }
}
