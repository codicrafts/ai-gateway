import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { isValidAuditAction, isValidISODate, listTeamAuditLogs } from '@/services/team/team-audit.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type AuditLogResponse,
  type AuditAction,
} from '@ai-gateway/shared-types/team';

/**
 * GET /api/teams/[id]/audit-logs
 * 查询审计日志
 * 
 * 验证：用户必须是 Owner 或 Admin
 * 查询参数：
 *   - page: 页码，默认 1
 *   - limit: 每页数量，默认 50
 *   - start_date: 开始日期（ISO 格式）
 *   - end_date: 结束日期（ISO 格式）
 *   - action: 操作类型筛选
 *   - user_id: 操作者 ID 筛选
 * 返回：AuditLogResponse（包含 logs、total、page、limit）
 * 按创建时间倒序排列
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AuditLogResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const action = searchParams.get('action');
    const userId = searchParams.get('user_id');

    if (startDate && !isValidISODate(startDate)) {
      return fail('开始日期格式无效，请使用 ISO 格式', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    if (endDate && !isValidISODate(endDate)) {
      return fail('结束日期格式无效，请使用 ISO 格式', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    if (action && !isValidAuditAction(action)) {
      return fail('无效的操作类型', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const result = await listTeamAuditLogs(teamId, {
      page,
      limit,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      action: (action as AuditAction | null) || undefined,
      user_id: userId || undefined,
    });
    return ok(result);
  } catch (error) {
    console.error('查询审计日志异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}
