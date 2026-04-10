import { NextResponse } from 'next/server';
import { beginPasskeyLogin, getPasskeyLoginCookieName } from '@/services/account/passkey.service';

export async function POST() {
  try {
    const { options, sessionCookie } = await beginPasskeyLogin();
    const response = NextResponse.json({ success: true, data: { options } });
    response.cookies.set({
      name: getPasskeyLoginCookieName(),
      value: encodeURIComponent(sessionCookie),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/account/passkey/login',
      maxAge: 60 * 10,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '初始化 Passkey 登录失败' },
      { status: 400 }
    );
  }
}
