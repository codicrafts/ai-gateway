import { NextResponse } from 'next/server';
import { issuePasskeyLoginToken } from '@/services/account/passkey-login-token.service';
import { finishPasskeyLogin, getPasskeyLoginCookieName } from '@/services/account/passkey.service';

export async function POST(request: Request) {
  const cookieName = getPasskeyLoginCookieName();
  const sessionCookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

  if (!sessionCookie) {
    return NextResponse.json({ success: false, error: 'Passkey 登录会话已失效，请重试' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const user = await finishPasskeyLogin(body, decodeURIComponent(sessionCookie));
    const loginToken = issuePasskeyLoginToken(user.id);
    const response = NextResponse.json({ success: true, data: { loginToken } });
    response.cookies.set({
      name: cookieName,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/account/passkey/login',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '完成 Passkey 登录失败' },
      { status: 400 }
    );
    response.cookies.set({
      name: cookieName,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/account/passkey/login',
      maxAge: 0,
    });
    return response;
  }
}
