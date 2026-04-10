import { assertProviderConsoleAccess } from '@/services/admin/provider-console-access.service';
import { getProviderConsoleSnapshot } from '@/services/admin/provider-console.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get('team_id');

    if (!teamId) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(teamId);
    const snapshot = await getProviderConsoleSnapshot();
    return ok(snapshot);
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}
