import { NextRequest } from 'next/server';
import { resetPasswordWithToken } from '@/services/account/app-user.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token || !password) {
      return fail('Missing required fields', 400, { code: 'MISSING_REQUIRED_FIELDS' });
    }

    if (password.length < 8) {
      return fail('Password must be at least 8 characters', 400, { code: 'WEAK_PASSWORD' });
    }

    await resetPasswordWithToken(token, password);
    return ok({ message: 'Password updated successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    if (message === '重置链接无效或已过期') {
      return fail('Reset link is invalid or expired', 400, { code: 'INVALID_OR_EXPIRED_TOKEN' });
    }

    return fail('Failed to reset password', 500, { code: 'RESET_PASSWORD_FAILED' });
  }
}
