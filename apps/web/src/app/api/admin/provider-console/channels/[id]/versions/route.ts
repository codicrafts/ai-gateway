import { assertProviderConsoleAccess } from '@/services/admin/provider-console-access.service';
import { listProviderConsoleChannelVersions } from '@/services/admin/provider-console.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId) || channelId <= 0) {
      return fail('无效的渠道 ID', 400);
    }

    const url = new URL(request.url);
    const teamId = url.searchParams.get('team_id');
    if (!teamId) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(teamId);
    const items = await listProviderConsoleChannelVersions(channelId);
    return ok({ items });
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}
