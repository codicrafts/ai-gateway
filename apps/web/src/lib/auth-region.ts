export type AuthAudience = 'domestic' | 'global';

function parseCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const items = cookieHeader.split(';');
  for (const item of items) {
    const [key, ...rest] = item.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return null;
}

function normalizeCountry(country?: string | null) {
  return country?.trim().toUpperCase() || null;
}

export function resolveAuthAudience(input: {
  country?: string | null;
  host?: string | null;
  acceptLanguage?: string | null;
}): AuthAudience {
  const country = normalizeCountry(input.country);

  if (country === 'CN') {
    return 'domestic';
  }

  const host = input.host?.toLowerCase() || '';
  const acceptLanguage = input.acceptLanguage?.toLowerCase() || '';

  if (!country && (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local'))) {
    return acceptLanguage.includes('zh') ? 'domestic' : 'global';
  }

  if (!country && acceptLanguage.startsWith('zh-cn')) {
    return 'domestic';
  }

  return 'global';
}

export function getAuthAudienceFromHeaders(headers: { get(name: string): string | null }): AuthAudience {
  const headerAudience = headers.get('x-auth-audience');

  if (headerAudience === 'domestic' || headerAudience === 'global') {
    return headerAudience;
  }

  const cookieAudience = parseCookieValue(headers.get('cookie'), 'auth_audience');

  if (cookieAudience === 'domestic' || cookieAudience === 'global') {
    return cookieAudience;
  }

  return resolveAuthAudience({
    country: headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country'),
    host: headers.get('host'),
    acceptLanguage: headers.get('accept-language'),
  });
}
