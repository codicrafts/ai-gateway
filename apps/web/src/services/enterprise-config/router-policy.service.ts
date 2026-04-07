import { createServerSupabaseClient, type Database } from '@/lib/supabase';

type RouterPolicyRow = Database['public']['Tables']['enterprise_router_policies']['Row'];

export type EnterpriseRouterPolicy = RouterPolicyRow;

export async function listEnterpriseRouterPolicies(teamId: string): Promise<EnterpriseRouterPolicy[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_router_policies')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message || '获取路由策略失败');
  }

  return data || [];
}
