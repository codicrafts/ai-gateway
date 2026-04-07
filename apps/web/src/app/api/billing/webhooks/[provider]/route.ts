import {
  isValidPaymentWebhookProvider,
  processPaymentWebhook,
} from '@/services/billing/payment.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

function getWebhookSecret() {
  return process.env.PAYMENT_WEBHOOK_SECRET || '';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    if (!isValidPaymentWebhookProvider(provider)) {
      return fail('不支持的支付回调提供方', 404);
    }

    const configuredSecret = getWebhookSecret();
    if (!configuredSecret) {
      return fail('PAYMENT_WEBHOOK_SECRET 未配置', 500);
    }

    const providedSecret = request.headers.get('x-payment-webhook-secret') || '';
    if (providedSecret !== configuredSecret) {
      return fail('Webhook 签名无效', 401);
    }

    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload) {
      return fail('Webhook payload 无效', 400);
    }

    const result = await processPaymentWebhook({
      provider,
      payload,
    });

    return ok(result);
  } catch (error) {
    console.error('处理支付回调异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500);
  }
}
