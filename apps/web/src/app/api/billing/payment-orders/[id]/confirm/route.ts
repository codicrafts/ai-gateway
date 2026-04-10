import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { confirmPaymentOrder } from '@/services/billing/payment.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const { id } = await params;
    const body = await request.json().catch(() => null) as { external_order_id?: string | null } | null;

    const order = await confirmPaymentOrder({
      orderId: id,
      userId: appUser.id,
      externalOrderId: body?.external_order_id || null,
    });

    return ok(order);
  } catch (error) {
    console.error('确认充值订单异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';

    if (
      message === '充值订单不存在' ||
      message === '当前用户未绑定 new-api 账户' ||
      message === '充值订单正在处理中，请稍后再试' ||
      message === '当前环境未启用手工确认充值订单'
    ) {
      return fail(message, 400);
    }

    return fail(message, 500);
  }
}
