import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '路由策略 | MeshRouter',
  description: '管理团队路由策略、回退规则、重试参数和渠道优先级。',
};

type DashboardRoutingPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardRoutingPage({ searchParams }: DashboardRoutingPageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'routing', requestedTeamId });
  const authAudience = getAuthAudienceFromHeaders(await headers());
  return <DashboardClient section="routing" initialBootstrap={initialBootstrap} authAudience={authAudience} />;
}
