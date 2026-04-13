import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { listGatewayConfiguredModels } from '@/services/gateway/gateway-model.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET() {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
  }

  try {
    const models = await listGatewayConfiguredModels();
    return ok(models);
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : '获取可用模型失败';
    return fail(message, 500);
  }
}
