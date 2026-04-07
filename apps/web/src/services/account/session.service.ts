import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAppUserById, sanitizeAppUser, upsertOAuthUser, type AppUser } from './app-user.service';

export async function getAuthenticatedAppUser(): Promise<AppUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const existing = await getAppUserById(session.user.id);
  if (existing) {
    return sanitizeAppUser(existing);
  }

  if (!session.user.email) {
    return null;
  }

  return upsertOAuthUser({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    provider: session.user.provider,
  });
}
