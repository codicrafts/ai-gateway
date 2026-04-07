/**
 * 审计日志导出 API
 * 
 * GET /api/teams/[id]/audit-logs/export - 导出审计日志为 CSV 格式
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { ErrorCode, type AuditAction } from '@ai-gateway/shared-types/team';

/**
 * 验证日期格式（ISO 格式）
 */
function isValidISODate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 转义 CSV 字段值
 * 处理包含逗号、引号、换行符的值
 */
function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // 如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 将 JSON 对象转换为字符串用于 CSV
 */
function jsonToCSVString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/**
 * GET /api/teams/[id]/audit-logs/export
 * 导出审计日志为 CSV 格式
 * 
 * 验证：用户必须是 Owner 或 Admin
 * 查询参数：
 *   - start_date: 开始日期（ISO 格式，可选）
 *   - end_date: 结束日期（ISO 格式，可选）
 * 返回：CSV 文件（Content-Type: text/csv）
 * CSV 字段：id, team_id, user_id, username, action, target_type, target_id, old_value, new_value, ip_address, user_agent, created_at
 * 按创建时间倒序排列
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: teamId } = await params;

    // 1. 验证用户认证和 Owner/Admin 权限
    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || '权限验证失败',
          code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
        },
        { status: authResult.code || 403 }
      );
    }

    // 2. 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 3. 验证日期参数
    if (startDate && !isValidISODate(startDate)) {
      return NextResponse.json(
        {
          success: false,
          error: '开始日期格式无效，请使用 ISO 格式',
          code: ErrorCode.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }

    if (endDate && !isValidISODate(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: '结束日期格式无效，请使用 ISO 格式',
          code: ErrorCode.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 4. 构建查询
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('team_id', teamId);

    // 应用时间范围筛选
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 按创建时间倒序排列
    query = query.order('created_at', { ascending: false });

    // 5. 执行查询
    const { data: logRecords, error: queryError } = await query;

    if (queryError) {
      console.error('查询审计日志失败:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: '查询审计日志失败',
          code: ErrorCode.INTERNAL_ERROR,
        },
        { status: 500 }
      );
    }

    const auditLogs = (logRecords || []) as Array<{
      id: string;
      team_id: string;
      user_id: string;
      action: string;
      target_type: string | null;
      target_id: string | null;
      old_value: string | null;
      new_value: string | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: string;
    }>;

    // 6. 获取操作者用户信息
    const userIds = Array.from(new Set(auditLogs.map((log) => log.user_id)));
    let userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);

      if (!usersError && users) {
        const typedUsers = users as Array<{ id: string; username: string | null }>;
        userMap = new Map(typedUsers.map((u) => [u.id, u.username || '未知用户']));
      }
    }

    // 7. 构建 CSV 内容
    const csvHeaders = [
      'id',
      'team_id',
      'user_id',
      'username',
      'action',
      'target_type',
      'target_id',
      'old_value',
      'new_value',
      'ip_address',
      'user_agent',
      'created_at',
    ];

    const csvRows: string[] = [];
    
    // 添加表头
    csvRows.push(csvHeaders.join(','));

    // 添加数据行
    for (const log of auditLogs) {
      const row = [
        escapeCSVField(log.id),
        escapeCSVField(log.team_id),
        escapeCSVField(log.user_id),
        escapeCSVField(userMap.get(log.user_id) || ''),
        escapeCSVField(log.action as AuditAction),
        escapeCSVField(log.target_type),
        escapeCSVField(log.target_id),
        escapeCSVField(jsonToCSVString(log.old_value ? JSON.parse(log.old_value) : null)),
        escapeCSVField(jsonToCSVString(log.new_value ? JSON.parse(log.new_value) : null)),
        escapeCSVField(log.ip_address),
        escapeCSVField(log.user_agent),
        escapeCSVField(log.created_at),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    // 8. 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `audit-logs-${teamId}-${timestamp}.csv`;

    // 9. 返回 CSV 文件响应
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('导出审计日志异常:', error);
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
