import { NextRequest } from 'next/server';
import { createPasswordResetRequest } from '@/services/account/app-user.service';
import { isAccountEmailConfigured, sendPasswordResetEmail } from '@/services/account/email-auth.service';
import { fail, ok } from '@/server/api/responses';

function normalizeAppBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return fail('Missing email', 400, { code: 'MISSING_EMAIL' });
    }

    const result = await createPasswordResetRequest(email);
    const baseUrl = normalizeAppBaseUrl(request);
    const resetUrl = result.resetToken ? `${baseUrl}/reset-password?token=${result.resetToken}` : null;
    const isProduction = process.env.NODE_ENV === 'production';

    if (result.issued && resetUrl) {
      if (isAccountEmailConfigured()) {
        await sendPasswordResetEmail(email, resetUrl, result.expiresAt);
      } else if (isProduction) {
        return fail('Password reset email is not configured', 500, { code: 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED' });
      }
    }

    return ok({
      message: 'If the account exists, a password reset email has been sent.',
      resetUrl: isProduction ? null : resetUrl,
      expiresAt: isProduction ? null : result.expiresAt ?? null,
    });
  } catch {
    return fail('Failed to create password reset request', 500, { code: 'FORGOT_PASSWORD_FAILED' });
  }
}
