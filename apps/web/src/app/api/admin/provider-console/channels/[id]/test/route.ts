import { assertProviderConsoleAccess } from '@/services/admin/provider-console-access.service';
import { testProviderConsoleChannel } from '@/services/admin/provider-console.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId) || channelId <= 0) {
      return fail('无效的渠道 ID', 400);
    }

    const body = await request.json() as { team_id?: string | null };
    if (!body.team_id) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(body.team_id);
    const result = await testProviderConsoleChannel(channelId);
    return ok(result);
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}
