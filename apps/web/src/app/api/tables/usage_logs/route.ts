import { NextRequest } from 'next/server';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { listGatewayUsageForTeam } from '@/services/gateway/gateway-usage.service';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tables/usage_logs
 * 获取用量日志列表
 * 
 * 查询参数：
 * - page: 页码（从 0 开始）
 * - limit: 每页数量（默认 20）
 * - token_id: 按 Token 筛选
 * - model: 按模型筛选
 */
export async function GET(request: NextRequest) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const tokenId = searchParams.get('token_id');
    const model = searchParams.get('model');
    const teamId = searchParams.get('team_id');
    const teamContext = await resolveAccessibleTeamContext(appUser.id, teamId);

    const result = await listGatewayUsageForTeam({
      teamId: teamContext.teamId,
      page,
      limit,
      tokenId: tokenId ? parseInt(tokenId, 10) : undefined,
      model: model || undefined,
    });

    return ok(result);
  } catch (error) {
    console.error('获取用量日志异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}
