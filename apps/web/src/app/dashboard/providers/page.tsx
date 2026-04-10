import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '供应商与渠道 | MeshRouter',
  description: '查看并管理运行时供应商目录、渠道状态和上游模型同步。',
};

type DashboardProvidersPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardProvidersPage({ searchParams }: DashboardProvidersPageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'providers', requestedTeamId });
  const authAudience = getAuthAudienceFromHeaders(await headers());
  return <DashboardClient section="providers" initialBootstrap={initialBootstrap} authAudience={authAudience} />;
}
