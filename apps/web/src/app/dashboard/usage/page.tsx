import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const metadata: Metadata = {
  title: '用量统计 | MeshRouter',
  description: '查看组织 API 请求日志、Token 消耗和模型使用分布。',
};

type DashboardUsagePageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardUsagePage({ searchParams }: DashboardUsagePageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'usage', requestedTeamId });
  const authAudience = getAuthAudienceFromHeaders(await headers());
  return <DashboardClient section="usage" initialBootstrap={initialBootstrap} authAudience={authAudience} />;
}
