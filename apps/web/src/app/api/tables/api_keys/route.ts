import { NextRequest } from 'next/server';
import { getClientInfo } from '@/lib/auditLog';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { createGatewayApiKey, listGatewayApiKeysForTeam } from '@/services/gateway/gateway-token.service';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import { fail, ok } from '@/server/api/responses';

/**
 * GET /api/tables/api_keys
 * 获取当前用户的 API Key 列表
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedAppUser();
    if (!currentUser) {
      return fail('请先登录', 401);
    }

    const teamContext = await resolveAccessibleTeamContext(currentUser.id, request.nextUrl.searchParams.get('team_id'));
    const apiKeys = await listGatewayApiKeysForTeam(teamContext.teamId);
    return ok(apiKeys);
  } catch (error) {
    console.error('获取 API Key 列表异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}

/**
 * POST /api/tables/api_keys
 * 创建新的 API Key
 */
export async function POST(request: NextRequest) {
  try {
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

    const apiKey = await createGatewayApiKey({
      userId: currentUser.id,
      teamId: typeof body?.team_id === 'string' ? body.team_id : null,
      input: body,
      clientInfo: getClientInfo(request),
    });
    return ok(apiKey, { status: 201 });
  } catch (error) {
    console.error('创建 API Key 异常:', error);
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
