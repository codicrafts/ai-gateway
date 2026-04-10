import type { TeamRole } from '@ai-gateway/shared-types/team';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';

export type GatewayScope =
  | {
      kind: 'personal';
      userId: string;
      role: 'owner';
    }
  | {
      kind: 'team';
      userId: string;
      teamId: string;
      role: TeamRole;
    };

export function isPersonalScopeToken(requestedTeamId?: string | null): boolean {
  return requestedTeamId === 'personal';
}

export async function resolveGatewayScope(
  userId: string,
  requestedTeamId?: string | null,
): Promise<GatewayScope> {
  if (isPersonalScopeToken(requestedTeamId)) {
    return {
      kind: 'personal',
      userId,
      role: 'owner',
    };
  }

  try {
    const teamContext = await resolveAccessibleTeamContext(userId, requestedTeamId);
    return {
      kind: 'team',
      userId,
      teamId: teamContext.teamId,
      role: teamContext.role,
    };
  } catch (error) {
    if (requestedTeamId) {
      throw error;
    }

    return {
      kind: 'personal',
      userId,
      role: 'owner',
    };
  }
}
