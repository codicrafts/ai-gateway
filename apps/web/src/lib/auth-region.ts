export type AuthAudience = 'domestic' | 'global';

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

  return resolveAuthAudience({
    country: headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country'),
    host: headers.get('host'),
    acceptLanguage: headers.get('accept-language'),
  });
}
