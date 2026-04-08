import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '个人中心 | MeshRouter',
  description: '管理个人资料、安全设置和账户信息。',
};

type DashboardProfilePageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardProfilePage({ searchParams }: DashboardProfilePageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'profile', requestedTeamId });
  const authAudience = getAuthAudienceFromHeaders(await headers());
  return <DashboardClient section="profile" initialBootstrap={initialBootstrap} authAudience={authAudience} />;
}
