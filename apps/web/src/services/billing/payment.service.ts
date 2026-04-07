import { topUpUser } from '@/lib/oneapi';
import { ensureNewApiLink, getAppUserById } from '@/services/account/app-user.service';
import { getOrganizationBalance } from '@/services/billing/billing.service';
import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';
import { ensureTeamRuntimeAccount, recordTeamRuntimeQuotaCredit } from '@/services/runtime-sync/org-runtime-account.service';

export type PaymentMethod = 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal';
export type PaymentWebhookProvider = PaymentMethod;
export type PaymentRegion = 'domestic' | 'international';
export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';

type PaymentOrderRow = Database['public']['Tables']['payment_orders']['Row'];
type PaymentWebhookEventRow = Database['public']['Tables']['payment_webhook_events']['Row'];

export type PaymentOrder = {
  id: string;
  payment_method: PaymentMethod;
  payment_region: PaymentRegion;
  currency: 'CNY' | 'USD';
  amount: number;
  status: PaymentOrderStatus;
  fulfillment_status: 'pending' | 'processing' | 'applied' | 'failed';
  checkout_reference: string;
  external_order_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  fulfilled_at: string | null;
  fulfilled_amount: number | null;
  fulfilled_new_api_user_id: number | null;
  created_at: string;
  updated_at: string;
};

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { region: PaymentRegion; currency: 'CNY' | 'USD'; label: string }> = {
  alipay: { region: 'domestic', currency: 'CNY', label: '支付宝' },
  wechat_pay: { region: 'domestic', currency: 'CNY', label: '微信支付' },
  credit_card: { region: 'international', currency: 'USD', label: '信用卡' },
  paypal: { region: 'international', currency: 'USD', label: 'PayPal' },
};

type NormalizedWebhookPayload = {
  eventId: string;
  checkoutReference: string | null;
  externalOrderId: string | null;
  paymentStatus: string;
  amount: number | null;
  rawPayload: Record<string, unknown>;
};

function mapPaymentOrder(order: PaymentOrderRow): PaymentOrder {
  return {
    id: order.id,
    payment_method: order.payment_method as PaymentMethod,
    payment_region: order.payment_region as PaymentRegion,
    currency: order.currency as 'CNY' | 'USD',
    amount: Number(order.amount),
    status: order.status as PaymentOrderStatus,
    fulfillment_status: order.fulfillment_status as 'pending' | 'processing' | 'applied' | 'failed',
    checkout_reference: order.checkout_reference,
    external_order_id: order.external_order_id,
    paid_at: order.paid_at,
    expires_at: order.expires_at,
    fulfilled_at: order.fulfilled_at,
    fulfilled_amount: order.fulfilled_amount === null ? null : Number(order.fulfilled_amount),
    fulfilled_new_api_user_id: order.fulfilled_new_api_user_id,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

function generateCheckoutReference(): string {
  return `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function isValidPaymentMethod(value: string): value is PaymentMethod {
  return value in PAYMENT_METHOD_CONFIG;
}

export function isValidPaymentWebhookProvider(value: string): value is PaymentWebhookProvider {
  return isValidPaymentMethod(value);
}

export function getPaymentMethodMeta(method: PaymentMethod) {
  return PAYMENT_METHOD_CONFIG[method];
}

export async function listPaymentOrders(userId: string, teamId?: string | null): Promise<PaymentOrder[]> {
  const supabase = createServerAdminSupabaseClient();
  let query = supabase
    .from('payment_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  query = teamId ? query.eq('team_id', teamId) : query.eq('user_id', userId);

  const { data, error } = await query;

  if (error) {
    throw new Error('获取充值订单失败');
  }

  return (data || []).map(mapPaymentOrder);
}

export async function createPaymentOrder(params: {
  userId: string;
  teamId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
}): Promise<PaymentOrder> {
  const supabase = createServerAdminSupabaseClient();
  const amount = Math.round(params.amount * 100) / 100;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('充值金额必须大于 0');
  }

  const methodMeta = getPaymentMethodMeta(params.paymentMethod);
  const checkoutReference = generateCheckoutReference();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('payment_orders')
    .insert({
      user_id: params.userId,
      team_id: params.teamId || null,
      payment_method: params.paymentMethod,
      payment_region: methodMeta.region,
      currency: methodMeta.currency,
      amount,
      status: 'pending',
      checkout_reference: checkoutReference,
      expires_at: expiresAt,
      metadata: {
        payment_method_label: methodMeta.label,
        settlement_mode: 'manual_pending_gateway_integration',
        ...(params.teamId ? { team_id: params.teamId } : {}),
      },
    } as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('创建充值订单失败');
  }

  return mapPaymentOrder(data);
}

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizePaymentWebhookPayload(
  provider: PaymentWebhookProvider,
  payload: Record<string, unknown>
): NormalizedWebhookPayload {
  if (provider === 'alipay') {
    return {
      eventId: String(payload.notify_id || payload.event_id || payload.id || payload.trade_no || ''),
      checkoutReference: typeof payload.out_trade_no === 'string' ? payload.out_trade_no : typeof payload.checkout_reference === 'string' ? payload.checkout_reference : null,
      externalOrderId: typeof payload.trade_no === 'string' ? payload.trade_no : typeof payload.external_order_id === 'string' ? payload.external_order_id : null,
      paymentStatus: normalizeStatus(payload.trade_status || payload.status),
      amount: parseAmount(payload.total_amount ?? payload.amount),
      rawPayload: payload,
    };
  }

  if (provider === 'wechat_pay') {
    const amountPayload = payload.amount as Record<string, unknown> | undefined;
    const cents = amountPayload && typeof amountPayload.total === 'number' ? amountPayload.total : null;
    return {
      eventId: String(payload.id || payload.event_id || payload.transaction_id || ''),
      checkoutReference: typeof payload.out_trade_no === 'string' ? payload.out_trade_no : typeof payload.checkout_reference === 'string' ? payload.checkout_reference : null,
      externalOrderId: typeof payload.transaction_id === 'string' ? payload.transaction_id : typeof payload.external_order_id === 'string' ? payload.external_order_id : null,
      paymentStatus: normalizeStatus(payload.trade_state || payload.status),
      amount: cents === null ? parseAmount(payload.amount) : Number(cents) / 100,
      rawPayload: payload,
    };
  }

  if (provider === 'paypal') {
    const resource = payload.resource as Record<string, unknown> | undefined;
    const resourceAmount = resource?.amount as Record<string, unknown> | undefined;
    return {
      eventId: String(payload.id || payload.event_id || ''),
      checkoutReference: typeof resource?.invoice_id === 'string'
        ? resource.invoice_id
        : typeof payload.checkout_reference === 'string'
          ? payload.checkout_reference
          : null,
      externalOrderId: typeof resource?.id === 'string'
        ? resource.id
        : typeof payload.external_order_id === 'string'
          ? payload.external_order_id
          : null,
      paymentStatus: normalizeStatus(payload.event_type || payload.payment_status || payload.status),
      amount: parseAmount(resourceAmount?.value ?? payload.amount),
      rawPayload: payload,
    };
  }

  const metadata = payload.metadata as Record<string, unknown> | undefined;
  return {
    eventId: String(payload.id || payload.event_id || payload.payment_intent || ''),
    checkoutReference: typeof metadata?.checkout_reference === 'string'
      ? metadata.checkout_reference
      : typeof payload.checkout_reference === 'string'
        ? payload.checkout_reference
        : null,
    externalOrderId: typeof payload.payment_intent === 'string'
      ? payload.payment_intent
      : typeof payload.external_order_id === 'string'
        ? payload.external_order_id
        : null,
    paymentStatus: normalizeStatus(payload.event_type || payload.status || payload.payment_status),
    amount: parseAmount(payload.amount),
    rawPayload: payload,
  };
}

function isPaidWebhookStatus(status: string): boolean {
  return [
    'TRADE_SUCCESS',
    'TRADE_FINISHED',
    'SUCCESS',
    'COMPLETED',
    'PAYMENT.SALE.COMPLETED',
    'CHECKOUT.ORDER.APPROVED',
    'PAID',
    'SUCCEEDED',
  ].includes(status);
}

async function getPaymentOrderByReference(params: {
  checkoutReference?: string | null;
  externalOrderId?: string | null;
}): Promise<PaymentOrderRow | null> {
  const supabase = createServerAdminSupabaseClient();

  if (params.checkoutReference) {
    const { data } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('checkout_reference', params.checkoutReference)
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  if (params.externalOrderId) {
    const { data } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('external_order_id', params.externalOrderId)
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  return null;
}

async function getWebhookEvent(
  provider: PaymentWebhookProvider,
  eventId: string
): Promise<PaymentWebhookEventRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data } = await supabase
    .from('payment_webhook_events')
    .select('*')
    .eq('provider', provider)
    .eq('event_id', eventId)
    .maybeSingle();

  return data;
}

async function createWebhookEvent(params: {
  provider: PaymentWebhookProvider;
  eventId: string;
  checkoutReference: string | null;
  externalOrderId: string | null;
  paymentStatus: string;
  payload: Record<string, unknown>;
}): Promise<PaymentWebhookEventRow> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('payment_webhook_events')
    .insert({
      provider: params.provider,
      event_id: params.eventId,
      checkout_reference: params.checkoutReference,
      external_order_id: params.externalOrderId,
      payment_status: params.paymentStatus,
      processing_status: 'received',
      payload: params.payload,
    } as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('记录支付回调事件失败');
  }

  return data;
}

async function updateWebhookEventStatus(params: {
  eventId: string;
  provider: PaymentWebhookProvider;
  processingStatus: 'processed' | 'ignored' | 'failed';
  errorMessage?: string | null;
}) {
  const supabase = createServerAdminSupabaseClient();
  await supabase
    .from('payment_webhook_events')
    .update({
      processing_status: params.processingStatus,
      error_message: params.errorMessage || null,
      processed_at: new Date().toISOString(),
    } as never)
    .eq('provider', params.provider)
    .eq('event_id', params.eventId);
}

export async function confirmPaymentOrder(params: {
  orderId: string;
  userId: string;
  externalOrderId?: string | null;
}): Promise<PaymentOrder> {
  const supabase = createServerAdminSupabaseClient();

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('id', params.orderId)
    .eq('user_id', params.userId)
    .single();
  const currentOrder = existingOrder as PaymentOrderRow | null;

  if (existingOrderError || !currentOrder) {
    throw new Error('充值订单不存在');
  }

  if (currentOrder.fulfillment_status === 'applied') {
    return mapPaymentOrder(currentOrder);
  }

  const runtimeTarget = await resolvePaymentRuntimeTarget({
    order: currentOrder,
    fallbackUserId: params.userId,
  });

  const { data: lockedOrder, error: lockError } = await supabase
    .from('payment_orders')
    .update({ fulfillment_status: 'processing' } as never)
    .eq('id', params.orderId)
    .eq('user_id', params.userId)
    .in('fulfillment_status', ['pending', 'failed'])
    .select('*')
    .single();
  const processingOrder = lockedOrder as PaymentOrderRow | null;

  if (lockError || !processingOrder) {
    throw new Error('充值订单正在处理中，请稍后再试');
  }

  const topUpResult = await topUpUser(runtimeTarget.newApiUserId, Number(processingOrder.amount));
  if (!topUpResult.success) {
    await supabase
      .from('payment_orders')
      .update({ fulfillment_status: 'failed' } as never)
      .eq('id', params.orderId);

    throw new Error(topUpResult.message || '调用 new-api topup 失败');
  }

  const lockedAmount = Number(processingOrder.amount);
  const organizationBalanceBefore = processingOrder.team_id
    ? await getOrganizationBalance(processingOrder.team_id)
    : 0;
  const organizationBalanceAfter = organizationBalanceBefore + lockedAmount;

  const now = new Date().toISOString();
  const { data: settledOrder, error: settleError } = await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      fulfillment_status: 'applied',
      paid_at: now,
      fulfilled_at: now,
      fulfilled_amount: lockedAmount,
      fulfilled_new_api_user_id: runtimeTarget.newApiUserId,
      external_order_id: params.externalOrderId || processingOrder.external_order_id || processingOrder.checkout_reference,
    } as never)
    .eq('id', params.orderId)
    .select('*')
    .single();
  const finalizedOrder = settledOrder as PaymentOrderRow | null;

  if (settleError || !finalizedOrder) {
    throw new Error('充值已到账，但订单状态更新失败，请立即核查');
  }

  const { error: transactionError } = await supabase
    .from('billing_transactions')
    .insert({
      user_id: params.userId,
      team_id: processingOrder.team_id,
      transaction_type: 'recharge',
      source_type: 'payment_order',
      source_id: params.orderId,
      amount: lockedAmount,
      currency: processingOrder.currency,
      balance_before: organizationBalanceBefore,
      balance_after: organizationBalanceAfter,
      status: 'applied',
      description: `充值到账 ${processingOrder.checkout_reference}`,
      metadata: {
        payment_method: processingOrder.payment_method,
        payment_region: processingOrder.payment_region,
        checkout_reference: processingOrder.checkout_reference,
        external_order_id: finalizedOrder.external_order_id,
        new_api_user_id: runtimeTarget.newApiUserId,
        runtime_target_type: runtimeTarget.type,
      },
    } as never);

  if (transactionError) {
    throw new Error('充值已到账，但账务流水记录失败，请立即核查');
  }

  const orderTeamId = processingOrder.team_id;
  if (orderTeamId) {
    await recordTeamRuntimeQuotaCredit({
      teamId: orderTeamId,
      amount: lockedAmount,
      actingUserId: params.userId,
    });

    await supabase.from('org_billing_ledger').insert({
      team_id: orderTeamId,
      type: 'topup',
      reference_id: processingOrder.checkout_reference,
      amount: lockedAmount,
      balance_after: organizationBalanceAfter,
      metadata: {
        description: `组织充值 ${processingOrder.checkout_reference}`,
        payment_method: processingOrder.payment_method,
        payment_region: processingOrder.payment_region,
        payment_order_id: params.orderId,
        new_api_user_id: runtimeTarget.newApiUserId,
        runtime_target_type: runtimeTarget.type,
      },
      occurred_at: now,
    } as never);
  }

  return mapPaymentOrder(finalizedOrder);
}

async function resolvePaymentRuntimeTarget(params: {
  order: PaymentOrderRow;
  fallbackUserId: string;
}): Promise<{ newApiUserId: number; type: 'team' | 'user' }> {
  if (params.order.team_id) {
    const runtimeAccount = await ensureTeamRuntimeAccount({
      teamId: params.order.team_id,
      actingUserId: params.fallbackUserId,
    });

    return {
      newApiUserId: runtimeAccount.newApiUserId,
      type: 'team',
    };
  }

  const appUser = await getAppUserById(params.order.user_id);
  if (!appUser) {
    throw new Error('订单所属用户不存在');
  }

  const linkedUser = appUser.new_api_user_id ? appUser : await ensureNewApiLink(appUser);
  if (!linkedUser.new_api_user_id) {
    throw new Error('当前用户未绑定 new-api 账户');
  }

  return {
    newApiUserId: linkedUser.new_api_user_id,
    type: 'user',
  };
}

export async function processPaymentWebhook(params: {
  provider: PaymentWebhookProvider;
  payload: Record<string, unknown>;
}): Promise<{
  duplicate: boolean;
  event_id: string;
  processing_status: 'processed' | 'ignored';
  order: PaymentOrder | null;
}> {
  const normalized = normalizePaymentWebhookPayload(params.provider, params.payload);

  if (!normalized.eventId) {
    throw new Error('支付回调缺少 event_id');
  }

  const existingEvent = await getWebhookEvent(params.provider, normalized.eventId);
  if (existingEvent?.processing_status === 'processed' || existingEvent?.processing_status === 'ignored') {
    const order = await getPaymentOrderByReference({
      checkoutReference: existingEvent.checkout_reference,
      externalOrderId: existingEvent.external_order_id,
    });

    return {
      duplicate: true,
      event_id: normalized.eventId,
      processing_status: existingEvent.processing_status,
      order: order ? mapPaymentOrder(order) : null,
    };
  }

  if (!existingEvent) {
    await createWebhookEvent({
      provider: params.provider,
      eventId: normalized.eventId,
      checkoutReference: normalized.checkoutReference,
      externalOrderId: normalized.externalOrderId,
      paymentStatus: normalized.paymentStatus,
      payload: normalized.rawPayload,
    });
  }

  const order = await getPaymentOrderByReference({
    checkoutReference: normalized.checkoutReference,
    externalOrderId: normalized.externalOrderId,
  });

  if (!order) {
    await updateWebhookEventStatus({
      eventId: normalized.eventId,
      provider: params.provider,
      processingStatus: 'failed',
      errorMessage: '未找到匹配的充值订单',
    });
    throw new Error('未找到匹配的充值订单');
  }

  if (order.payment_method !== params.provider) {
    await updateWebhookEventStatus({
      eventId: normalized.eventId,
      provider: params.provider,
      processingStatus: 'failed',
      errorMessage: '回调支付方式与订单不匹配',
    });
    throw new Error('回调支付方式与订单不匹配');
  }

  if (!isPaidWebhookStatus(normalized.paymentStatus)) {
    await updateWebhookEventStatus({
      eventId: normalized.eventId,
      provider: params.provider,
      processingStatus: 'ignored',
      errorMessage: `忽略非支付成功事件: ${normalized.paymentStatus || 'UNKNOWN'}`,
    });

    return {
      duplicate: false,
      event_id: normalized.eventId,
      processing_status: 'ignored',
      order: mapPaymentOrder(order),
    };
  }

  const confirmedOrder = await confirmPaymentOrder({
    orderId: order.id,
    userId: order.user_id,
    externalOrderId: normalized.externalOrderId,
  });

  await updateWebhookEventStatus({
    eventId: normalized.eventId,
    provider: params.provider,
    processingStatus: 'processed',
  });

  return {
    duplicate: false,
    event_id: normalized.eventId,
    processing_status: 'processed',
    order: confirmedOrder,
  };
}
