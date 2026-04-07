export type DashboardRouteSearchParams =
  | Promise<{ team?: string | string[] | undefined }>
  | { team?: string | string[] | undefined }
  | undefined;

export async function resolveRequestedTeamId(
  searchParams: DashboardRouteSearchParams
): Promise<string | null> {
  const resolved = searchParams ? await searchParams : undefined;
  const rawTeam = resolved?.team;
  if (Array.isArray(rawTeam)) {
    return rawTeam[0] ?? null;
  }
  return rawTeam ?? null;
}
