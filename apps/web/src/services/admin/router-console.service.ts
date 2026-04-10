import { getOptions } from '@/lib/oneapi';
import { listAdminProviders } from './provider-admin.service';
import type { AdminChannel } from './admin-types';
import {
  createEnterpriseRouterPolicy,
  deleteEnterpriseRouterPolicy,
  listEnterpriseRouterPolicies,
  updateEnterpriseRouterPolicy,
  type EnterpriseRouterPolicy,
  type EnterpriseRouterPolicyInput,
} from '@/services/enterprise-config/router-policy.service';

export type RouterConsoleRuntimeSettings = {
  retry_times: number;
  automatic_disable_channel_enabled: boolean;
  automatic_enable_channel_enabled: boolean;
  channel_disable_threshold: number;
  automatic_retry_status_codes: string;
  channel_affinity_enabled: boolean;
  channel_affinity_ttl_seconds: number;
};

export type RouterConsoleSnapshot = {
  policies: EnterpriseRouterPolicy[];
  channels: AdminChannel[];
  runtime_settings: RouterConsoleRuntimeSettings | null;
};

function normalizeBoolean(value: string | undefined) {
  return value === 'true';
}

function normalizeNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapOptionsToRuntimeSettings(optionMap: Map<string, string>): RouterConsoleRuntimeSettings {
  return {
    retry_times: normalizeNumber(optionMap.get('RetryTimes'), 0),
    automatic_disable_channel_enabled: normalizeBoolean(optionMap.get('AutomaticDisableChannelEnabled')),
    automatic_enable_channel_enabled: normalizeBoolean(optionMap.get('AutomaticEnableChannelEnabled')),
    channel_disable_threshold: normalizeNumber(optionMap.get('ChannelDisableThreshold'), 0),
    automatic_retry_status_codes: optionMap.get('AutomaticRetryStatusCodes') || '',
    channel_affinity_enabled: normalizeBoolean(optionMap.get('channel_affinity_setting.enabled')),
    channel_affinity_ttl_seconds: normalizeNumber(optionMap.get('channel_affinity_setting.default_ttl_seconds'), 0),
  };
}

export async function getRouterConsoleSnapshot(teamId: string): Promise<RouterConsoleSnapshot> {
  const [policies, providers, optionsResult] = await Promise.all([
    listEnterpriseRouterPolicies(teamId),
    listAdminProviders(),
    getOptions().catch(() => null),
  ]);

  let runtimeSettings: RouterConsoleRuntimeSettings | null = null;
  if (optionsResult?.success && Array.isArray(optionsResult.data)) {
    const optionMap = new Map(optionsResult.data.map((item) => [item.key, item.value]));
    runtimeSettings = mapOptionsToRuntimeSettings(optionMap);
  }

  return {
    policies,
    channels: providers.channels,
    runtime_settings: runtimeSettings,
  };
}

export async function createRouterConsolePolicy(input: EnterpriseRouterPolicyInput) {
  return createEnterpriseRouterPolicy(input);
}

export async function updateRouterConsolePolicy(id: string, input: EnterpriseRouterPolicyInput) {
  return updateEnterpriseRouterPolicy(id, input);
}

export async function removeRouterConsolePolicy(id: string, teamId: string) {
  return deleteEnterpriseRouterPolicy(id, teamId);
}
