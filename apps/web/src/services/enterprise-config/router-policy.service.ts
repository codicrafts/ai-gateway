import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';

type RouterPolicyRow = Database['public']['Tables']['enterprise_router_policies']['Row'];
type RouterPolicyInsert = Database['public']['Tables']['enterprise_router_policies']['Insert'];
type RouterPolicyUpdate = Database['public']['Tables']['enterprise_router_policies']['Update'];

export type EnterpriseRouterPolicy = RouterPolicyRow;
export type EnterpriseRouterPolicyInput = {
  teamId: string;
  actorUserId?: string | null;
  policy_name: string;
  fallback_enabled?: boolean;
  retry_count?: number;
  load_balance_mode?: EnterpriseRouterPolicy['load_balance_mode'];
  channel_weights?: Record<string, unknown>;
  channel_priorities?: Record<string, unknown>;
  rate_limit?: Record<string, unknown>;
  affinity_ttl?: number | null;
  circuit_breaker_enabled?: boolean;
  config_payload?: Record<string, unknown>;
};

function toInsertPayload(input: EnterpriseRouterPolicyInput): RouterPolicyInsert {
  return {
    team_id: input.teamId,
    policy_name: input.policy_name.trim(),
    fallback_enabled: input.fallback_enabled ?? true,
    retry_count: Number.isFinite(input.retry_count) ? Number(input.retry_count) : 0,
    load_balance_mode: input.load_balance_mode ?? 'priority',
    channel_weights: input.channel_weights ?? {},
    channel_priorities: input.channel_priorities ?? {},
    rate_limit: input.rate_limit ?? {},
    affinity_ttl: input.affinity_ttl ?? null,
    circuit_breaker_enabled: input.circuit_breaker_enabled ?? true,
    config_payload: input.config_payload ?? {},
    sync_status: 'pending',
    sync_error: null,
    created_by: input.actorUserId ?? null,
    updated_by: input.actorUserId ?? null,
  };
}

function toUpdatePayload(input: EnterpriseRouterPolicyInput): RouterPolicyUpdate {
  return {
    policy_name: input.policy_name.trim(),
    fallback_enabled: input.fallback_enabled ?? true,
    retry_count: Number.isFinite(input.retry_count) ? Number(input.retry_count) : 0,
    load_balance_mode: input.load_balance_mode ?? 'priority',
    channel_weights: input.channel_weights ?? {},
    channel_priorities: input.channel_priorities ?? {},
    rate_limit: input.rate_limit ?? {},
    affinity_ttl: input.affinity_ttl ?? null,
    circuit_breaker_enabled: input.circuit_breaker_enabled ?? true,
    config_payload: input.config_payload ?? {},
    sync_status: 'pending',
    sync_error: null,
    updated_by: input.actorUserId ?? null,
  };
}

export async function listEnterpriseRouterPolicies(teamId: string): Promise<EnterpriseRouterPolicy[]> {
  const supabase = createServerAdminSupabaseClient();
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

export async function createEnterpriseRouterPolicy(input: EnterpriseRouterPolicyInput): Promise<EnterpriseRouterPolicy> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_router_policies')
    .insert(toInsertPayload(input) as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '创建路由策略失败');
  }

  return data;
}

export async function updateEnterpriseRouterPolicy(id: string, input: EnterpriseRouterPolicyInput): Promise<EnterpriseRouterPolicy> {
  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_router_policies')
    .update(toUpdatePayload(input) as never)
    .eq('id', id)
    .eq('team_id', input.teamId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新路由策略失败');
  }

  return data;
}

export async function deleteEnterpriseRouterPolicy(id: string, teamId: string) {
  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('enterprise_router_policies')
    .delete()
    .eq('id', id)
    .eq('team_id', teamId);

  if (error) {
    throw new Error(error.message || '删除路由策略失败');
  }
}
