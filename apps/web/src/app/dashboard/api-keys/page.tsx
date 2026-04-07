import type { Metadata } from 'next';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const metadata: Metadata = {
  title: 'API 密钥 | MeshRouter',
  description: '创建、管理并同步组织 API 密钥。',
};

type DashboardApiKeysPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardApiKeysPage({ searchParams }: DashboardApiKeysPageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'api-keys', requestedTeamId });
  return <DashboardClient section="api-keys" initialBootstrap={initialBootstrap} />;
}
