import { NextRequest } from 'next/server';
import { createServerAdminSupabaseClient } from '@/lib/supabase';

/**
 * One API 使用日志 Webhook 接收端点
 * 
 * 每次 API 调用后，One API 会发送 Webhook 到这个端点
 * 我们立即将数据写入 Supabase，实现实时同步
 */

interface OneApiWebhookPayload {
  id: number;
  created_at: number;
  type: number;
  username: string;
  token_name: string;
  model_name: string;
  start_time: number;
  end_time: number;
  channel_id: number;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  content: string;
  user_id: number;
  token_id: number;
}

const NEW_API_LOG_TYPE_CONSUME = 2;
const NEW_API_LOG_TYPE_ERROR = 5;

export async function POST(request: NextRequest) {
  try {
    // 1. 验证签名（可选但推荐）
    const signature = request.headers.get('x-one-api-signature');
    const webhookSecret = process.env.ONE_API_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      // TODO: 验证签名
      // const isValid = verifySignature(body, signature, webhookSecret);
      // if (!isValid) {
      //   return Response.json({ error: 'Invalid signature' }, { status: 401 });
      // }
    }

    // 2. 解析 Webhook 数据
    const payload: OneApiWebhookPayload = await request.json();

    const isSuccessLog = payload.type === NEW_API_LOG_TYPE_CONSUME;
    const isFailedLog = payload.type === NEW_API_LOG_TYPE_ERROR;

    if (!isSuccessLog && !isFailedLog) {
      return Response.json({ success: true, message: 'Unsupported log type, skipped' });
    }

    console.log('[Webhook] 收到 One API 使用日志:', {
      id: payload.id,
      model: payload.model_name,
      tokens: payload.prompt_tokens + payload.completion_tokens,
      quota: payload.quota,
      type: payload.type,
    });

    // 3. 获取 Supabase 客户端
    const supabase = createServerAdminSupabaseClient();

    // 4. 查找对应的团队 ID
    const { data: syncMapping, error: syncMappingError } = await supabase
      .from('org_api_key_sync')
      .select('org_api_key_id')
      .eq('new_api_token_id', payload.token_id)
      .maybeSingle();

    if (syncMappingError) {
      console.error('[Webhook] 查询 API Key 映射失败:', syncMappingError);
      return Response.json({ error: 'Failed to find API key' }, { status: 500 });
    }

    if (!syncMapping?.org_api_key_id) {
      console.warn('[Webhook] 未找到对应的 API Key:', payload.token_id);
      // 不返回错误，避免 One API 重试
      return Response.json({ success: true, message: 'API key not found, skipped' });
    }

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('org_api_keys')
      .select('team_id, id, used_quota')
      .eq('id', syncMapping.org_api_key_id)
      .maybeSingle();

    if (apiKeyError) {
      console.error('[Webhook] 查询 API Key 失败:', apiKeyError);
      return Response.json({ error: 'Failed to find API key' }, { status: 500 });
    }

    if (!apiKeyData) {
      console.warn('[Webhook] 未找到对应的组织 API Key:', syncMapping.org_api_key_id);
      return Response.json({ success: true, message: 'API key not found, skipped' });
    }

    // 5. 检查是否已存在（防止重复）
    const { data: existingLog } = await supabase
      .from('org_usage_ledger')
      .select('id')
      .eq('new_api_log_id', payload.id)
      .maybeSingle();

    if (existingLog) {
      console.log('[Webhook] 日志已存在，跳过:', payload.id);
      return Response.json({ success: true, message: 'Log already exists' });
    }

    // 6. 插入使用日志
    const { error: insertError } = await supabase
      .from('org_usage_ledger')
      .insert({
        new_api_log_id: payload.id,
        team_id: apiKeyData.team_id,
        org_api_key_id: apiKeyData.id,
        model: payload.model_name,
        prompt_tokens: payload.prompt_tokens,
        completion_tokens: payload.completion_tokens,
        total_tokens: payload.prompt_tokens + payload.completion_tokens,
        amount: isSuccessLog ? payload.quota / 500000 : 0,
        request_count: 1,
        status: isSuccessLog ? 'success' : 'failed',
        error_message: isFailedLog ? payload.content : null,
        occurred_at: new Date(payload.created_at * 1000).toISOString(),
      });

    if (insertError) {
      console.error('[Webhook] 插入日志失败:', insertError);
      return Response.json({ error: 'Failed to insert log' }, { status: 500 });
    }

    // 7. 更新 API Key 的使用统计
    if (isSuccessLog) {
      const nextUsedQuota = Number(apiKeyData.used_quota || 0) + payload.quota / 500000;
      const { error: updateError } = await supabase
        .from('org_api_keys')
        .update({
          used_quota: nextUsedQuota,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', apiKeyData.id);

      if (updateError) {
        console.error('[Webhook] 更新 API Key 统计失败:', updateError);
        // 不返回错误，日志已经插入成功
      }
    }

    console.log('[Webhook] ✅ 使用日志同步成功:', {
      logId: payload.id,
      teamId: apiKeyData.team_id,
      tokens: payload.prompt_tokens + payload.completion_tokens,
      cost: isSuccessLog ? payload.quota / 500000 : 0,
    });

    return Response.json({ 
      success: true,
      message: 'Usage log synced successfully',
      data: {
        log_id: payload.id,
        team_id: apiKeyData.team_id,
        tokens: payload.prompt_tokens + payload.completion_tokens,
      },
    });

  } catch (error) {
    console.error('[Webhook] 处理失败:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// 健康检查端点
export async function GET() {
  return Response.json({ 
    status: 'ok',
    endpoint: '/api/webhooks/one-api-usage',
    message: 'One API usage webhook endpoint is ready',
  });
}
