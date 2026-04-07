import { createServerSupabaseClient, type Database } from '@/lib/supabase';

type ModelPolicyRow = Database['public']['Tables']['enterprise_model_policies']['Row'];

export type EnterpriseModelPolicy = ModelPolicyRow;

export async function listEnterpriseModelPolicies(teamId: string): Promise<EnterpriseModelPolicy[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_model_policies')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message || '获取模型策略失败');
  }

  return data || [];
}
