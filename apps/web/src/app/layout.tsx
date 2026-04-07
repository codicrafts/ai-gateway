import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Notification from '@/components/Notification';
import AnalyticsScripts from '@/components/analytics/AnalyticsScripts';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAppUserById, sanitizeAppUser, upsertOAuthUser } from '@/services/account/app-user.service';
import type { User } from '@ai-gateway/shared-types';
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/config/site';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  let initialAuthUser: User | null = null;

  if (session?.user?.id) {
    const existingUser = await getAppUserById(session.user.id);

    if (existingUser) {
      initialAuthUser = sanitizeAppUser(existingUser);
    } else if (session.user.email) {
      initialAuthUser = await upsertOAuthUser({
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        provider: session.user.provider,
      });
    }
  }

  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
      </head>
      <body>
        <AnalyticsScripts />
        <Providers initialAuthUser={initialAuthUser}>
          <Notification />
          {children}
        </Providers>
      </body>
    </html>
  );
}
