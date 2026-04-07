import { NextRequest } from 'next/server';
import { getClientInfo } from '@/lib/auditLog';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getGatewayApiKeySecret, removeGatewayApiKey, updateGatewayApiKey } from '@/services/gateway/gateway-token.service';
import { fail, ok } from '@/server/api/responses';

/**
 * PUT /api/tables/api_keys/[id]
 * 更新 API Key
 */
export async function PUT(
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

    let body;
    try {
      body = await request.json();
    } catch {
      return fail('请求体格式错误', 400);
    }

    await updateGatewayApiKey({
      userId: currentUser.id,
      teamId: typeof body?.team_id === 'string' ? body.team_id : request.nextUrl.searchParams.get('team_id'),
      input: {
        id: tokenId,
        ...body,
      },
      clientInfo: getClientInfo(request),
    });

    return ok({ id: tokenId });
  } catch (error) {
    console.error('更新 API Key 异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    const status = [
      'API Key 名称不能为空',
      'API Key 名称不能超过 100 个字符',
      '备注说明不能超过 500 个字符',
      '存在无效的权限范围配置',
      'IP 白名单格式无效',
      '过期时间格式无效',
    ].includes(message)
      ? 400
      : 500;
    return fail(message, status);
  }
}

/**
 * DELETE /api/tables/api_keys/[id]
 * 删除 API Key
 */
export async function DELETE(
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

    await removeGatewayApiKey({
      userId: currentUser.id,
      teamId: request.nextUrl.searchParams.get('team_id'),
      id: tokenId,
      clientInfo: getClientInfo(request),
    });
    return ok({ id: tokenId });
  } catch (error) {
    console.error('删除 API Key 异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}

/**
 * POST /api/tables/api_keys/[id]
 * 获取完整 API Key，仅在显式复制/创建成功场景使用
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
