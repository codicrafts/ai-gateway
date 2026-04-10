import { assertProviderConsoleAccess } from '@/services/admin/provider-console-access.service';
import { rollbackProviderConsoleChannelVersion } from '@/services/admin/provider-console.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const channelId = Number(id);
    const rollbackVersionId = Number(versionId);
    if (!Number.isFinite(channelId) || channelId <= 0 || !Number.isFinite(rollbackVersionId) || rollbackVersionId <= 0) {
      return fail('无效的版本参数', 400);
    }

    const body = await request.json() as { team_id?: string | null };
    if (!body.team_id) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(body.team_id);
    const result = await rollbackProviderConsoleChannelVersion(channelId, rollbackVersionId);
    return ok(result);
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}
