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
    return NextResponse.json({ error: message, code: 'ACCOUNT_CODE_FAILED' }, { status: 400 });
  }
}
