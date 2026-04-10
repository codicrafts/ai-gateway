import { NextRequest } from 'next/server';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import {
  buildGatewayUsageExportCsv,
  buildGatewayUsageExportPdf,
  getGatewayUsageExportRows,
} from '@/services/gateway/gateway-usage-export.service';
import { fail } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const teamId = searchParams.get('team_id');
    const tokenId = searchParams.get('token_id');
    const model = searchParams.get('model');
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200', 10)));

    if (!['csv', 'pdf'].includes(format)) {
      return fail('不支持的导出格式', 400);
    }

    const rows = await getGatewayUsageExportRows({
      userId: appUser.id,
      teamId,
      limit,
      tokenId: tokenId ? parseInt(tokenId, 10) : undefined,
      model: model || undefined,
    });
    const dateSuffix = new Date().toISOString().slice(0, 10);

    if (format === 'pdf') {
      const pdf = Buffer.from(buildGatewayUsageExportPdf(rows));
      return new Response(new Blob([pdf], { type: 'application/pdf' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="request-logs-${dateSuffix}.pdf"`,
        },
      });
    }

    const csv = buildGatewayUsageExportCsv(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="request-logs-${dateSuffix}.csv"`,
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '导出请求日志失败', 500);
  }
}
