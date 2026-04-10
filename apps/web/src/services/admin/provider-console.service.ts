import { updateChannel } from '@/lib/oneapi';
import {
  createAdminChannel,
  createAdminVendor,
  listAdminProviders,
  runChannelHealthcheck,
  syncChannelModels,
} from './provider-admin.service';
import type {
  ProviderConsoleChannelInput,
  ProviderConsoleChannelVersion,
  ProviderConsoleSnapshot,
  ProviderConsoleVendorInput,
} from './provider-console-types';
import {
  PROVIDER_CHANNEL_STATUS_AUTO_DISABLED,
  PROVIDER_CHANNEL_STATUS_ENABLED,
  PROVIDER_CHANNEL_STATUS_MANUAL_DISABLED,
} from './provider-console-types';
import { listChannelVersions, rollbackChannelVersion } from '@/lib/oneapi';

export async function getProviderConsoleSnapshot(): Promise<ProviderConsoleSnapshot> {
  const { vendors, channels } = await listAdminProviders();

  const enabledChannelCount = channels.filter((channel) => channel.status === PROVIDER_CHANNEL_STATUS_ENABLED).length;
  const manualDisabledCount = channels.filter((channel) => channel.status === PROVIDER_CHANNEL_STATUS_MANUAL_DISABLED).length;
  const autoDisabledCount = channels.filter((channel) => channel.status === PROVIDER_CHANNEL_STATUS_AUTO_DISABLED).length;
  const unhealthyChannelCount = channels.filter((channel) => {
    if (channel.status !== PROVIDER_CHANNEL_STATUS_ENABLED) {
      return true;
    }
    return Number(channel.response_time || 0) > 5000;
  }).length;

  return {
    vendors: vendors.sort((left, right) => left.name.localeCompare(right.name)),
    channels: channels.sort((left, right) => {
      const statusGap = left.status - right.status;
      if (statusGap !== 0) return statusGap;
      return left.name.localeCompare(right.name);
    }),
    summary: {
      vendor_count: vendors.length,
      channel_count: channels.length,
      enabled_channel_count: enabledChannelCount,
      manual_disabled_channel_count: manualDisabledCount,
      auto_disabled_channel_count: autoDisabledCount,
      unhealthy_channel_count: unhealthyChannelCount,
    },
  };
}

export async function createProviderConsoleVendor(input: ProviderConsoleVendorInput) {
  return createAdminVendor(input);
}

export async function createProviderConsoleChannel(input: ProviderConsoleChannelInput) {
  return createAdminChannel(input);
}

export async function setProviderConsoleChannelStatus(channelId: number, status: number) {
  const result = await updateChannel({ id: channelId, status });
  if (!result.success) {
    throw new Error(result.message || '更新渠道状态失败');
  }
  return result.data ?? null;
}

export async function testProviderConsoleChannel(channelId: number) {
  return runChannelHealthcheck(channelId);
}

export async function syncProviderConsoleChannel(channelId: number) {
  return syncChannelModels(channelId);
}

export async function listProviderConsoleChannelVersions(channelId: number): Promise<ProviderConsoleChannelVersion[]> {
  const result = await listChannelVersions(channelId);
  if (!result.success) {
    throw new Error(result.message || '获取渠道版本历史失败');
  }
  if (!Array.isArray(result.data?.items)) {
    return [];
  }
  return result.data.items.map((item) => ({
    ...item,
    operator_id: item.operator_id ?? null,
  }));
}

export async function rollbackProviderConsoleChannelVersion(channelId: number, versionId: number) {
  const result = await rollbackChannelVersion(channelId, versionId);
  if (!result.success) {
    throw new Error(result.message || '回滚渠道版本失败');
  }
  return result.data ?? null;
}
