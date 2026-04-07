import { createServerSupabaseClient, type Database } from '@/lib/supabase';
import type { TeamRole } from '@ai-gateway/shared-types/team';

type TeamMemberRecord = Database['public']['Tables']['team_members']['Row'];

export type TeamContext = {
  teamId: string;
  role: TeamRole;
};

export async function resolveAccessibleTeamContext(
  userId: string,
  requestedTeamId?: string | null
): Promise<TeamContext> {
  const supabase = createServerSupabaseClient();

  if (requestedTeamId) {
    const { data } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('team_id', requestedTeamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const member = data as Pick<TeamMemberRecord, 'team_id' | 'role'> | null;
    if (!member) {
      throw new Error('当前团队不存在或无访问权限');
    }

    return {
      teamId: member.team_id,
      role: member.role,
    };
  }

  const { data } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const member = data as Pick<TeamMemberRecord, 'team_id' | 'role'> | null;
  if (!member) {
    throw new Error('当前用户尚未加入任何团队');
  }

  return {
    teamId: member.team_id,
    role: member.role,
  };
}
