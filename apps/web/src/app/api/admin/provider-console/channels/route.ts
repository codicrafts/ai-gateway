import { assertProviderConsoleAccess } from '@/services/admin/provider-console-access.service';
import { createProviderConsoleChannel } from '@/services/admin/provider-console.service';
import type { ProviderConsoleChannelInput } from '@/services/admin/provider-console-types';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as ProviderConsoleChannelInput & { team_id?: string | null };
    if (!body.team_id) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(body.team_id);
    await createProviderConsoleChannel(body);
    return ok({ success: true });
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}
