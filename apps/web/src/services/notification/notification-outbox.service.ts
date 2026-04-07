import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';

type NotificationOutboxInsert = Database['public']['Tables']['notification_outbox']['Insert'];
type NotificationOutboxUpdate = Database['public']['Tables']['notification_outbox']['Update'];

export async function enqueueEmailNotification(payload: {
  recipient: string;
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServerAdminSupabaseClient();
  const insertPayload: NotificationOutboxInsert = {
    channel: 'email',
    recipient: payload.recipient,
    subject: payload.subject,
    body_html: payload.bodyHtml,
    status: 'queued',
    metadata: payload.metadata || {},
  };

  const { data, error } = await supabase
    .from('notification_outbox')
    .insert(insertPayload as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('写入通知出箱失败');
  }

  return data;
}

export async function markNotificationOutboxStatus(
  id: string,
  patch: {
    status: 'queued' | 'sent' | 'failed';
    provider?: string | null;
    error_message?: string | null;
    sent_at?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const supabase = createServerAdminSupabaseClient();
  const updatePayload: NotificationOutboxUpdate = {
    status: patch.status,
    provider: patch.provider ?? null,
    error_message: patch.error_message ?? null,
    sent_at: patch.sent_at ?? null,
    metadata: patch.metadata,
  };

  const { error } = await supabase
    .from('notification_outbox')
    .update(updatePayload as never)
    .eq('id', id);

  if (error) {
    throw new Error('更新通知出箱状态失败');
  }
}
