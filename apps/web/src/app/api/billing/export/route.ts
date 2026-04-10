import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { buildBillingExportCsv, getBillingExportRows } from '@/services/billing/billing.service';
import { fail } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const teamId = new URL(request.url).searchParams.get('team_id');
    const rows = await getBillingExportRows(appUser, teamId);
    const csv = buildBillingExportCsv(rows);
    const filename = `billing-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : '导出账单失败', 500);
  }
}
