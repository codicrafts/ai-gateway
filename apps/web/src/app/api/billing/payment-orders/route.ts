import { getAuthenticatedAppUser } from '@/services/account/session.service';
import {
  createPaymentOrder,
  isValidPaymentMethod,
  listPaymentOrders,
  type PaymentMethod,
} from '@/services/billing/payment.service';
import { resolveAccessibleTeamContext } from '@/services/team/team-context.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const teamId = new URL(request.url).searchParams.get('team_id');
    const teamContext = await resolveAccessibleTeamContext(appUser.id, teamId);
    const orders = await listPaymentOrders(appUser.id, teamContext.teamId);
    return ok(orders);
  } catch (error) {
    console.error('获取充值订单异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}

export async function POST(request: Request) {
  try {
    const appUser = await getAuthenticatedAppUser();
    if (!appUser) {
      return fail('请先登录', 401);
    }

    const body = await request.json().catch(() => null) as { amount?: number; payment_method?: string; team_id?: string | null } | null;
    if (!body) {
      return fail('请求体格式错误', 400);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail('充值金额必须大于 0', 400);
    }

    if (!body.payment_method || !isValidPaymentMethod(body.payment_method)) {
      return fail('支付方式无效', 400);
    }

    const teamContext = await resolveAccessibleTeamContext(appUser.id, body.team_id || null);
    const order = await createPaymentOrder({
      userId: appUser.id,
      teamId: teamContext.teamId,
      amount,
      paymentMethod: body.payment_method as PaymentMethod,
    });

    return ok(order, { status: 201 });
  } catch (error) {
    console.error('创建充值订单异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}
