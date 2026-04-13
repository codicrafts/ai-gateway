import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import type { AppUser } from '@/services/account/app-user.service';
import { resolveGatewayScope } from '@/services/gateway/gateway-scope.service';

export type BillingEntry = {
  id: string;
  type: 'usage' | 'recharge';
  title: string;
  description: string;
  amount: number;
  created_at: string;
  status: 'settled' | 'failed';
  model?: string;
  token_name?: string;
  total_tokens?: number;
  currency?: 'CNY' | 'USD';
  reference?: string;
};

export type BillingSummary = {
  current_balance: number;
  current_month_spend: number;
  previous_month_spend: number;
  change_percentage: number | null;
  average_daily_spend: number;
  estimated_available_days: number | null;
  recent_entries: BillingEntry[];
  currency: 'USD';
};

export type BillingExportRow = {
  time: string;
  type: 'usage' | 'recharge';
  title: string;
  description: string;
  model: string;
  token_name: string;
  total_tokens: number | '';
  amount: number;
  currency: string;
  reference: string;
};

function isSameMonth(date: Date, target: Date): boolean {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function getPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function preserveSmallAmount(value: number): number {
  const rounded = roundToTwo(value);
  if (rounded === 0 && value > 0) {
    return value;
  }
  return rounded;
}

type OrgUsageLedgerRow = Database['public']['Tables']['org_usage_ledger']['Row'];
type OrgBillingLedgerRow = Database['public']['Tables']['org_billing_ledger']['Row'];
type BillingTransactionRow = Database['public']['Tables']['billing_transactions']['Row'];

function mapOrgBillingEntry(row: OrgBillingLedgerRow): BillingEntry {
  const metadata = row.metadata as Record<string, unknown>;
  const title = row.type === 'topup'
    ? '组织充值'
    : row.type === 'refund'
      ? '退款'
      : row.type === 'adjustment'
        ? '账务调整'
        : '组织账单';

  return {
    id: `${row.type}-${row.id}`,
    type: row.type === 'usage' ? 'usage' : 'recharge',
    title,
    description: typeof metadata.description === 'string' ? metadata.description : row.reference_id || title,
    amount: Number(row.amount),
    created_at: row.occurred_at,
    status: 'settled',
    currency: 'USD',
    reference: row.reference_id || undefined,
  };
}

function mapPersonalRechargeEntry(row: BillingTransactionRow): BillingEntry {
  return {
    id: `recharge-${row.id}`,
    type: 'recharge',
    title: '账户充值',
    description: row.description || row.source_id,
    amount: Number(row.amount),
    created_at: row.created_at,
    status: row.status === 'reversed' ? 'failed' : 'settled',
    currency: row.currency,
    reference: row.source_id,
  };
}

export async function getOrganizationBalance(teamId: string): Promise<number> {
  const supabase = createServerAdminSupabaseClient();
  const { data: usageRowsData, error: usageError } = await supabase
    .from('org_usage_ledger')
    .select('amount')
    .eq('team_id', teamId)
    .eq('status', 'success');

  if (usageError) {
    throw new Error('获取组织用量账本失败');
  }

  const { data: billingRowsData, error: billingError } = await supabase
    .from('org_billing_ledger')
    .select('amount')
    .eq('team_id', teamId);

  if (billingError) {
    throw new Error('获取组织账务账本失败');
  }

  const usageRows = (usageRowsData || []) as Array<Pick<OrgUsageLedgerRow, 'amount'>>;
  const billingRows = (billingRowsData || []) as Array<Pick<OrgBillingLedgerRow, 'amount'>>;

  return roundToTwo(
    billingRows.reduce((sum, row) => sum + Number(row.amount || 0), 0) -
      usageRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  );
}

export async function getBillingSummaryForTeam(teamId: string): Promise<BillingSummary> {
  const supabase = createServerAdminSupabaseClient();

  const [usageRowsResult, usageAggregateRowsResult, billingRowsResult, billingBalanceRowsResult, apiKeyNamesResult] = await Promise.allSettled([
    supabase
      .from('org_usage_ledger')
      .select('*')
      .eq('team_id', teamId)
      .order('occurred_at', { ascending: false })
      .limit(100),
    supabase
      .from('org_usage_ledger')
      .select('amount, occurred_at')
      .eq('team_id', teamId)
      .eq('status', 'success'),
    supabase
      .from('org_billing_ledger')
      .select('*')
      .eq('team_id', teamId)
      .order('occurred_at', { ascending: false })
      .limit(100),
    supabase
      .from('org_billing_ledger')
      .select('amount')
      .eq('team_id', teamId),
    supabase
      .from('org_api_keys')
      .select('id, name')
      .eq('team_id', teamId),
  ]);

  const usageAggregateResolved =
    usageAggregateRowsResult.status === 'fulfilled' ? usageAggregateRowsResult.value : null;
  if (!usageAggregateResolved?.error && usageAggregateResolved?.data) {
    // noop
  } else {
    const cause =
      usageAggregateRowsResult.status === 'rejected'
        ? usageAggregateRowsResult.reason
        : usageAggregateResolved?.error;
    throw new Error(`获取组织用量聚合数据失败${cause ? `: ${String(cause)}` : ''}`);
  }

  const billingBalanceResolved =
    billingBalanceRowsResult.status === 'fulfilled' ? billingBalanceRowsResult.value : null;
  if (!billingBalanceResolved?.error && billingBalanceResolved?.data) {
    // noop
  } else {
    const cause =
      billingBalanceRowsResult.status === 'rejected'
        ? billingBalanceRowsResult.reason
        : billingBalanceResolved?.error;
    throw new Error(`获取组织账务聚合数据失败${cause ? `: ${String(cause)}` : ''}`);
  }

  const usageRowsResolved = usageRowsResult.status === 'fulfilled' ? usageRowsResult.value : null;
  if (usageRowsResolved?.error) {
    console.error('Failed to load org usage ledger rows for billing summary', {
      teamId,
      error: usageRowsResolved.error,
    });
  } else if (usageRowsResult.status === 'rejected') {
    console.error('Failed to load org usage ledger rows for billing summary', {
      teamId,
      error: usageRowsResult.reason,
    });
  }

  const billingRowsResolved = billingRowsResult.status === 'fulfilled' ? billingRowsResult.value : null;
  if (billingRowsResolved?.error) {
    console.error('Failed to load org billing ledger rows for billing summary', {
      teamId,
      error: billingRowsResolved.error,
    });
  } else if (billingRowsResult.status === 'rejected') {
    console.error('Failed to load org billing ledger rows for billing summary', {
      teamId,
      error: billingRowsResult.reason,
    });
  }

  const apiKeyNamesResolved = apiKeyNamesResult.status === 'fulfilled' ? apiKeyNamesResult.value : null;
  if (apiKeyNamesResolved?.error) {
    console.error('Failed to load org API key names for billing summary', {
      teamId,
      error: apiKeyNamesResolved.error,
    });
  } else if (apiKeyNamesResult.status === 'rejected') {
    console.error('Failed to load org API key names for billing summary', {
      teamId,
      error: apiKeyNamesResult.reason,
    });
  }

  const usageRows = ((usageRowsResolved && !usageRowsResolved.error ? usageRowsResolved.data : []) || []) as OrgUsageLedgerRow[];
  const billingRows = ((billingRowsResolved && !billingRowsResolved.error ? billingRowsResolved.data : []) || []) as OrgBillingLedgerRow[];
  const usageAggregateRows = (usageAggregateResolved.data || []) as Array<Pick<OrgUsageLedgerRow, 'amount' | 'occurred_at'>>;
  const billingBalanceRows = (billingBalanceResolved.data || []) as Array<Pick<OrgBillingLedgerRow, 'amount'>>;
  const apiKeyNameMap = new Map(
    ((((apiKeyNamesResolved && !apiKeyNamesResolved.error ? apiKeyNamesResolved.data : []) || []) as Array<{ id: number; name: string }>)).map((row) => [Number(row.id), row.name])
  );
  const now = new Date();
  const previousMonth = getPreviousMonth(now);
  const recentThirtyDaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const usageEntries: BillingEntry[] = usageRows.map((row) => ({
    id: `usage-${row.new_api_log_id ?? row.id}`,
    type: 'usage',
    title: row.status === 'failed' ? '调用失败' : '模型调用',
    description:
      row.status === 'failed'
        ? ''
        : (row.provider ? `${row.model} / ${row.provider}` : row.model),
    amount: row.status === 'failed' ? 0 : -Number(row.amount || 0),
    created_at: row.occurred_at,
    status: row.status === 'failed' ? 'failed' : 'settled',
    model: row.model,
    token_name: row.org_api_key_id
      ? apiKeyNameMap.get(Number(row.org_api_key_id)) || `Key #${row.org_api_key_id}`
      : undefined,
    total_tokens: Number(row.total_tokens || 0),
  }));
  const rechargeEntries = billingRows.map(mapOrgBillingEntry);

  const currentMonthSpend = usageAggregateRows
    .filter((row) => isSameMonth(new Date(row.occurred_at), now))
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const previousMonthSpend = usageAggregateRows
    .filter((row) => isSameMonth(new Date(row.occurred_at), previousMonth))
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const recentThirtyDaySpend = usageAggregateRows
    .filter((row) => new Date(row.occurred_at) >= recentThirtyDaysStart)
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const averageDailySpend = roundToTwo(recentThirtyDaySpend / 30);
  const totalBillingAmount = billingBalanceRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalUsageAmount = usageAggregateRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const currentBalance = roundToTwo(totalBillingAmount - totalUsageAmount);
  const estimatedAvailableDays = averageDailySpend > 0 ? Math.max(0, Math.floor(currentBalance / averageDailySpend)) : null;
  const changePercentage = previousMonthSpend > 0
    ? roundToTwo(((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100)
    : null;

  const recentEntries = [...usageEntries, ...rechargeEntries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return {
    current_balance: currentBalance,
    current_month_spend: preserveSmallAmount(currentMonthSpend),
    previous_month_spend: preserveSmallAmount(previousMonthSpend),
    change_percentage: changePercentage,
    average_daily_spend: preserveSmallAmount(averageDailySpend),
    estimated_available_days: estimatedAvailableDays,
    recent_entries: recentEntries,
    currency: 'USD',
  };
}

export async function getBillingSummary(appUser: AppUser, teamId?: string | null): Promise<BillingSummary> {
  const scope = await resolveGatewayScope(appUser.id, teamId);
  if (scope.kind === 'team') {
    return getBillingSummaryForTeam(scope.teamId);
  }

  const supabase = createServerAdminSupabaseClient();
  const [usageRowsResult, usageAggregateRowsResult, rechargeRowsResult, apiKeyNamesResult] = await Promise.all([
    supabase
      .from('org_usage_ledger')
      .select('*')
      .is('team_id', null)
      .eq('user_id', appUser.id)
      .order('occurred_at', { ascending: false })
      .limit(100),
    supabase
      .from('org_usage_ledger')
      .select('amount, occurred_at')
      .is('team_id', null)
      .eq('user_id', appUser.id)
      .eq('status', 'success'),
    supabase
      .from('billing_transactions')
      .select('*')
      .is('team_id', null)
      .eq('user_id', appUser.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('org_api_keys')
      .select('id, name')
      .is('team_id', null)
      .eq('user_id', appUser.id),
  ]);

  const { data: usageRowsData, error: usageError } = usageRowsResult;
  if (usageError) {
    throw new Error('获取个人账单失败');
  }

  const { data: usageAggregateRowsData, error: usageAggregateError } = usageAggregateRowsResult;
  if (usageAggregateError) {
    throw new Error('获取个人用量聚合数据失败');
  }

  const { data: rechargeRowsData, error: rechargeRowsError } = rechargeRowsResult;
  if (rechargeRowsError) {
    throw new Error('获取个人充值流水失败');
  }

  const { data: apiKeyNamesData, error: apiKeyNamesError } = apiKeyNamesResult;
  if (apiKeyNamesError) {
    throw new Error('获取个人 API Key 名称失败');
  }

  const usageRows = (usageRowsData || []) as OrgUsageLedgerRow[];
  const usageAggregateRows = (usageAggregateRowsData || []) as Array<Pick<OrgUsageLedgerRow, 'amount' | 'occurred_at'>>;
  const rechargeRows = (rechargeRowsData || []) as BillingTransactionRow[];
  const apiKeyNameMap = new Map(
    ((apiKeyNamesData || []) as Array<{ id: number; name: string }>).map((row) => [Number(row.id), row.name]),
  );
  const now = new Date();
  const previousMonth = getPreviousMonth(now);
  const recentThirtyDaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const usageEntries: BillingEntry[] = usageRows.map((row) => ({
    id: `usage-${row.new_api_log_id ?? row.id}`,
    type: 'usage',
    title: row.status === 'failed' ? '调用失败' : '模型调用',
    description:
      row.status === 'failed'
        ? ''
        : (row.provider ? `${row.model} / ${row.provider}` : row.model),
    amount: row.status === 'failed' ? 0 : -Number(row.amount || 0),
    created_at: row.occurred_at,
    status: row.status === 'failed' ? 'failed' : 'settled',
    model: row.model,
    token_name: row.org_api_key_id
      ? apiKeyNameMap.get(Number(row.org_api_key_id)) || `Key #${row.org_api_key_id}`
      : undefined,
    total_tokens: Number(row.total_tokens || 0),
  }));
  const rechargeEntries = rechargeRows.map(mapPersonalRechargeEntry);

  const currentMonthSpend = usageAggregateRows
    .filter((row) => isSameMonth(new Date(row.occurred_at), now))
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const previousMonthSpend = usageAggregateRows
    .filter((row) => isSameMonth(new Date(row.occurred_at), previousMonth))
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const recentThirtyDaySpend = usageAggregateRows
    .filter((row) => new Date(row.occurred_at) >= recentThirtyDaysStart)
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const averageDailySpend = roundToTwo(recentThirtyDaySpend / 30);
  const currentBalance = roundToTwo(Number(appUser.balance || 0));
  const estimatedAvailableDays = averageDailySpend > 0 ? Math.max(0, Math.floor(currentBalance / averageDailySpend)) : null;
  const changePercentage = previousMonthSpend > 0
    ? roundToTwo(((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100)
    : null;

  const recentEntries = [...usageEntries, ...rechargeEntries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return {
    current_balance: currentBalance,
    current_month_spend: preserveSmallAmount(currentMonthSpend),
    previous_month_spend: preserveSmallAmount(previousMonthSpend),
    change_percentage: changePercentage,
    average_daily_spend: preserveSmallAmount(averageDailySpend),
    estimated_available_days: estimatedAvailableDays,
    recent_entries: recentEntries,
    currency: 'USD',
  };
}

export async function getBillingExportRows(appUser: AppUser, teamId?: string | null): Promise<BillingExportRow[]> {
  const summary = await getBillingSummary(appUser, teamId);

  return summary.recent_entries.map((entry) => ({
    time: entry.created_at,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    model: entry.model || '',
    token_name: entry.token_name || '',
    total_tokens: entry.total_tokens ?? '',
    amount: entry.amount,
    currency: entry.currency || summary.currency,
    reference: entry.reference || '',
  }));
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildBillingExportCsv(rows: BillingExportRow[]): string {
  const headers = [
    'time',
    'type',
    'title',
    'description',
    'model',
    'token_name',
    'total_tokens',
    'amount',
    'currency',
    'reference',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.time,
        row.type,
        row.title,
        row.description,
        row.model,
        row.token_name,
        row.total_tokens,
        row.amount,
        row.currency,
        row.reference,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  return lines.join('\n');
}
