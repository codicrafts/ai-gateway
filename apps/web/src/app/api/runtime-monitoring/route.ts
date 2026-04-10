import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getRuntimeMonitoringSnapshot } from '@/services/monitoring/runtime-monitoring.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const url = new URL(request.url);
    const hours = Number(url.searchParams.get('hours') || '24');
    const channelLimit = Number(url.searchParams.get('channel_limit') || '10');
    const snapshot = await getRuntimeMonitoringSnapshot({ hours, channelLimit });
    return ok(snapshot);
  } catch (error) {
    console.error('获取运行时监控异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}
