import { NextRequest } from 'next/server';
import { getClientInfo } from '@/lib/auditLog';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getGatewayApiKeySecret } from '@/services/gateway/gateway-token.service';
import { fail, ok } from '@/server/api/responses';

/**
 * POST /api/gateway/keys/[id]/key
 * 按需获取完整 API Key，列表仍只返回掩码值
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tokenId = parseInt(id, 10);

    if (isNaN(tokenId)) {
      return fail('无效的 API Key ID', 400);
    }

    const currentUser = await getAuthenticatedAppUser();
    if (!currentUser) {
      return fail('请先登录', 401);
    }

    const fullKey = await getGatewayApiKeySecret({
      userId: currentUser.id,
      teamId: request.nextUrl.searchParams.get('team_id'),
      id: tokenId,
      clientInfo: getClientInfo(request),
    });

    return ok({ key: fullKey });
  } catch (error) {
    console.error('获取完整 API Key 异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}
