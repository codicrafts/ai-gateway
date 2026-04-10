import { checkTeamRole, getCurrentUser } from '@/lib/teamAuth';

export async function assertProviderConsoleAccess(teamId: string) {
  const user = await getCurrentUser();
  if (!user) {
    const error = new Error('请先登录');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const auth = await checkTeamRole(teamId, user.id, ['owner', 'admin']);
  if (!auth.success) {
    const error = new Error(auth.error || '权限不足');
    (error as Error & { status?: number }).status = auth.code || 403;
    throw error;
  }

  return user;
}
