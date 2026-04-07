import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
] as const;

export async function POST() {
  const response = NextResponse.json({ success: true });

  for (const cookieName of SESSION_COOKIE_NAMES) {
    response.cookies.set(cookieName, '', {
      path: '/',
      expires: new Date(0),
      httpOnly: cookieName.includes('session-token') || cookieName.includes('csrf-token'),
      secure: cookieName.startsWith('__Secure-') || cookieName.startsWith('__Host-'),
      sameSite: 'lax',
    });
  }

  return response;
}
