import { headers } from 'next/headers';
import LoginPageClient from '@/components/auth/LoginPageClient';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const authAudience = getAuthAudienceFromHeaders(headers());

  return <LoginPageClient authAudience={authAudience} />;
}
