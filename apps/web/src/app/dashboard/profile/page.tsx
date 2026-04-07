import type { Metadata } from 'next';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

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
  return <DashboardClient section="profile" initialBootstrap={initialBootstrap} />;
}
