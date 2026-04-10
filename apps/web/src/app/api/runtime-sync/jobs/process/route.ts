import { fail, ok } from '@/server/api/responses';
import { processPendingOrgRuntimeSyncJobs } from '@/services/runtime-sync/org-runtime-sync.service';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.RUNTIME_SYNC_PROCESSOR_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const bearer = request.headers.get('authorization');
  if (bearer === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get('x-runtime-sync-secret') === secret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return fail('未授权的同步处理请求', 401);
    }

    const body = (await request.json().catch(() => null)) as
      | {
          entity_type?: 'usage_pull';
          limit?: number;
        }
      | null;

    const result = await processPendingOrgRuntimeSyncJobs({
      entityType: body?.entity_type || 'usage_pull',
      limit: typeof body?.limit === 'number' ? Math.max(1, Math.min(body.limit, 100)) : 20,
    });

    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '执行运行时同步处理器失败', 500);
  }
}
