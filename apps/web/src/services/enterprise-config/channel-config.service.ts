import { createServerSupabaseClient, type Database } from '@/lib/supabase';
import type { AdminChannelFormInput } from '@/services/admin/admin-types';

type ChannelConfigRow = Database['public']['Tables']['enterprise_channel_configs']['Row'];
type ChannelConfigInsert = Database['public']['Tables']['enterprise_channel_configs']['Insert'];
type ChannelConfigUpdate = Database['public']['Tables']['enterprise_channel_configs']['Update'];

export type EnterpriseChannelSyncStatus = ChannelConfigRow['sync_status'];

export type EnterpriseChannelConfig = ChannelConfigRow;

export type EnterpriseChannelConfigInput = {
  teamId: string;
  actorUserId?: string | null;
  channel: AdminChannelFormInput;
};

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toConfigPayload(channel: AdminChannelFormInput) {
  return {
    openai_organization: normalizeOptionalText(channel.openai_organization),
    other: normalizeOptionalText(channel.other),
    model_mapping: normalizeOptionalText(channel.model_mapping),
    status_code_mapping: normalizeOptionalText(channel.status_code_mapping),
    param_override: normalizeOptionalText(channel.param_override),
    header_override: normalizeOptionalText(channel.header_override),
    setting: normalizeOptionalText(channel.setting),
    settings: normalizeOptionalText(channel.settings),
    remark: normalizeOptionalText(channel.remark),
  };
}

function mapChannelFormToInsert(input: EnterpriseChannelConfigInput): ChannelConfigInsert {
  const { actorUserId, teamId, channel } = input;

  return {
    team_id: teamId,
    provider_type: channel.type,
    name: channel.name.trim(),
    base_url: normalizeOptionalText(channel.base_url),
    models: channel.models.trim(),
    test_model: normalizeOptionalText(channel.test_model),
    group_name: channel.group.trim() || 'default',
    tag: normalizeOptionalText(channel.tag),
    priority: Number.isFinite(channel.priority) ? channel.priority : 0,
    weight: Number.isFinite(channel.weight) ? channel.weight : 0,
    auto_ban: channel.auto_ban === 1,
    status: channel.status === 1 ? 'active' : 'disabled',
    config_payload: toConfigPayload(channel),
    created_by: actorUserId ?? null,
    updated_by: actorUserId ?? null,
  };
}

function mapChannelFormToUpdate(input: EnterpriseChannelConfigInput): ChannelConfigUpdate {
  const { actorUserId, channel } = input;

  return {
    provider_type: channel.type,
    name: channel.name.trim(),
    base_url: normalizeOptionalText(channel.base_url),
    models: channel.models.trim(),
    test_model: normalizeOptionalText(channel.test_model),
    group_name: channel.group.trim() || 'default',
    tag: normalizeOptionalText(channel.tag),
    priority: Number.isFinite(channel.priority) ? channel.priority : 0,
    weight: Number.isFinite(channel.weight) ? channel.weight : 0,
    auto_ban: channel.auto_ban === 1,
    status: channel.status === 1 ? 'active' : 'disabled',
    config_payload: toConfigPayload(channel),
    sync_status: 'pending',
    sync_error: null,
    updated_by: actorUserId ?? null,
  };
}

export async function listEnterpriseChannelConfigs(teamId: string): Promise<EnterpriseChannelConfig[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_channel_configs')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message || '获取企业渠道配置失败');
  }

  return data || [];
}

export async function getEnterpriseChannelConfigById(id: string): Promise<EnterpriseChannelConfig | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_channel_configs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '获取企业渠道配置失败');
  }

  return data;
}

export async function createEnterpriseChannelConfig(input: EnterpriseChannelConfigInput): Promise<EnterpriseChannelConfig> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_channel_configs')
    .insert(mapChannelFormToInsert(input) as never)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '创建企业渠道配置失败');
  }

  return data;
}

export async function updateEnterpriseChannelConfig(id: string, input: EnterpriseChannelConfigInput): Promise<EnterpriseChannelConfig> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_channel_configs')
    .update(mapChannelFormToUpdate(input) as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新企业渠道配置失败');
  }

  return data;
}

export async function updateEnterpriseChannelSyncState(
  id: string,
  payload: {
    syncStatus: EnterpriseChannelSyncStatus;
    syncError?: string | null;
    newApiChannelId?: number | null;
    syncedAt?: string | null;
  }
) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('enterprise_channel_configs')
    .update({
      sync_status: payload.syncStatus,
      sync_error: payload.syncError ?? null,
      new_api_channel_id: payload.newApiChannelId ?? undefined,
      last_synced_at: payload.syncedAt ?? (payload.syncStatus === 'synced' ? new Date().toISOString() : null),
    } as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '更新渠道同步状态失败');
  }

  return data;
}
