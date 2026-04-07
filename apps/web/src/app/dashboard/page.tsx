import { redirect } from 'next/navigation';
import { resolveRequestedTeamId, type DashboardRouteSearchParams } from './route-utils';

type DashboardIndexPageProps = {
  searchParams?: DashboardRouteSearchParams;
};

export default async function DashboardIndexPage({ searchParams }: DashboardIndexPageProps) {
  const teamId = await resolveRequestedTeamId(searchParams);
  redirect(teamId ? `/dashboard/overview?team=${encodeURIComponent(teamId)}` : '/dashboard/overview');
}
