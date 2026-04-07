import type { Metadata } from 'next';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getDashboardPageBootstrap } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from '../route-utils';

export const metadata: Metadata = {
  title: '账单 | MeshRouter',
  description: '查看组织余额、账单明细和充值订单。',
};

type DashboardBillingPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardBillingPage({ searchParams }: DashboardBillingPageProps) {
  const requestedTeamId = await resolveRequestedTeamId(searchParams);
  const initialBootstrap = await getDashboardPageBootstrap({ section: 'billing', requestedTeamId });
  return <DashboardClient section="billing" initialBootstrap={initialBootstrap} />;
}
