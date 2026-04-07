import type { Metadata } from 'next';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const metadata: Metadata = {
  title: '团队管理 | MeshRouter',
  description: '管理团队成员、邀请、角色权限和审计记录。',
};

type DashboardTeamPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardTeamPage({ searchParams }: DashboardTeamPageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'team', requestedTeamId });
  return <DashboardClient section="team" initialBootstrap={initialBootstrap} />;
}
