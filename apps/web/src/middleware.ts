import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { resolveAuthAudience } from '@/lib/auth-region';

const PROTECTED_PREFIXES = ['/dashboard', '/playground'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

function matchesPath(pathname: string, candidates: string[]) {
  return candidates.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authAudience = resolveAuthAudience({
    country: request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country'),
    host: request.nextUrl.hostname,
    acceptLanguage: request.headers.get('accept-language'),
  });
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (matchesPath(pathname, PROTECTED_PREFIXES) && !token) {
    const loginUrl = new URL('/login', request.url);
    const callbackUrl = `${pathname}${search}`;
    if (callbackUrl !== '/dashboard' && callbackUrl !== '/dashboard/overview') {
      loginUrl.searchParams.set('callbackUrl', callbackUrl);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPath(pathname, AUTH_ROUTES) && token) {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }

  if (pathname === '/dashboard') {
    const overviewUrl = new URL('/dashboard/overview', request.url);
    overviewUrl.search = search;
    return NextResponse.redirect(overviewUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-auth-audience', authAudience);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set('auth_audience', authAudience, {
    path: '/',
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  });

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/playground/:path*', '/login', '/register', '/forgot-password', '/reset-password'],
};
