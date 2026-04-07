import { createServerSupabaseClient, type Database } from '@/lib/supabase';

type SyncJobRow = Database['public']['Tables']['sync_jobs']['Row'];
type SyncJobInsert = Database['public']['Tables']['sync_jobs']['Insert'];
type SyncJobUpdate = Database['public']['Tables']['sync_jobs']['Update'];

export type SyncJob = SyncJobRow;

export async function createSyncJob(input: SyncJobInsert): Promise<SyncJob> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sync_jobs')
    .insert(input as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '创建同步任务失败');
  }

  return data;
}

export async function updateSyncJob(id: string, input: SyncJobUpdate): Promise<SyncJob> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sync_jobs')
    .update(input as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新同步任务失败');
  }

  return data;
}
