import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '控制台概览 | MeshRouter',
  description: '查看组织余额、本月请求、本月消耗和整体使用概况。',
};

type DashboardOverviewPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardOverviewPage({ searchParams }: DashboardOverviewPageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'overview', requestedTeamId });
  const authAudience = getAuthAudienceFromHeaders(await headers());
  return <DashboardClient section="overview" initialBootstrap={initialBootstrap} authAudience={authAudience} />;
}
