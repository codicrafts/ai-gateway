import {
  createChannel,
  createVendor,
  deleteChannel,
  deleteVendor,
  fetchUpstreamChannelModels,
  getAllChannels,
  getAllVendors,
  syncChannelAbilities,
  testChannel,
  updateChannel,
  updateVendor,
} from '@/lib/oneapi';
import type {
  AdminChannel,
  AdminChannelFormInput,
  AdminVendor,
  AdminVendorFormInput,
} from './admin-types';

function toNullableString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toOptionalNumber(value?: number) {
  return Number.isFinite(value as number) ? value : undefined;
}

export async function listAdminProviders(): Promise<{ vendors: AdminVendor[]; channels: AdminChannel[] }> {
  const [vendorsResult, channelsResult] = await Promise.all([
    getAllVendors(),
    getAllChannels(),
  ]);

  if (!vendorsResult.success) {
    throw new Error(vendorsResult.message || '获取供应商失败');
  }
  if (!channelsResult.success) {
    throw new Error(channelsResult.message || '获取渠道失败');
  }

  return {
    vendors: vendorsResult.data?.items || [],
    channels: channelsResult.data?.items || [],
  };
}

export async function createAdminVendor(input: AdminVendorFormInput) {
  const result = await createVendor({
    name: input.name.trim(),
    description: input.description?.trim() || '',
    icon: input.icon?.trim() || '',
    status: input.status,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message || '创建供应商失败');
  }

  return result.data as AdminVendor;
}

export async function updateAdminVendor(input: AdminVendorFormInput) {
  if (!input.id) {
    throw new Error('缺少供应商 ID');
  }

  const result = await updateVendor({
    id: input.id,
    name: input.name.trim(),
    description: input.description?.trim() || '',
    icon: input.icon?.trim() || '',
    status: input.status,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message || '更新供应商失败');
  }

  return result.data as AdminVendor;
}

export async function removeAdminVendor(id: number) {
  const result = await deleteVendor(id);
  if (!result.success) {
    throw new Error(result.message || '删除供应商失败');
  }
}

export async function createAdminChannel(input: AdminChannelFormInput) {
  const result = await createChannel({
    mode: 'single',
    channel: {
      type: input.type,
      name: input.name.trim(),
      key: input.key,
      models: input.models.trim(),
      group: input.group.trim() || 'default',
      status: input.status,
      test_model: toNullableString(input.test_model),
      base_url: toNullableString(input.base_url),
      openai_organization: toNullableString(input.openai_organization),
      other: input.other?.trim() || '',
      model_mapping: toNullableString(input.model_mapping),
      status_code_mapping: toNullableString(input.status_code_mapping),
      param_override: toNullableString(input.param_override),
      header_override: toNullableString(input.header_override),
      setting: toNullableString(input.setting),
      settings: input.settings?.trim() || '',
      tag: toNullableString(input.tag),
      priority: toOptionalNumber(input.priority),
      weight: toOptionalNumber(input.weight),
      remark: toNullableString(input.remark),
      auto_ban: input.auto_ban,
    },
  });

  if (!result.success) {
    throw new Error(result.message || '创建渠道失败');
  }
}

export async function updateAdminChannel(input: AdminChannelFormInput) {
  if (!input.id) {
    throw new Error('缺少渠道 ID');
  }

  const result = await updateChannel({
    id: input.id,
    type: input.type,
    name: input.name.trim(),
    key: input.key,
    models: input.models.trim(),
    group: input.group.trim() || 'default',
    status: input.status,
    test_model: toNullableString(input.test_model),
    base_url: toNullableString(input.base_url),
    openai_organization: toNullableString(input.openai_organization),
    other: input.other?.trim() || '',
    model_mapping: toNullableString(input.model_mapping),
    status_code_mapping: toNullableString(input.status_code_mapping),
    param_override: toNullableString(input.param_override),
    header_override: toNullableString(input.header_override),
    setting: toNullableString(input.setting),
    settings: input.settings?.trim() || '',
    tag: toNullableString(input.tag),
    priority: toOptionalNumber(input.priority),
    weight: toOptionalNumber(input.weight),
    remark: toNullableString(input.remark),
    auto_ban: input.auto_ban,
  });

  if (!result.success) {
    throw new Error(result.message || '更新渠道失败');
  }
}

export async function removeAdminChannel(id: number) {
  const result = await deleteChannel(id);
  if (!result.success) {
    throw new Error(result.message || '删除渠道失败');
  }
}

export async function runChannelHealthcheck(id: number) {
  const result = await testChannel(id);
  if (!result.success) {
    throw new Error(result.message || '渠道测试失败');
  }
  return result;
}

export async function syncChannelModels(id: number) {
  const fetchResult = await fetchUpstreamChannelModels(id);
  if (!fetchResult.success) {
    throw new Error(fetchResult.message || '拉取上游模型失败');
  }

  const fixResult = await syncChannelAbilities();
  if (!fixResult.success) {
    throw new Error(fixResult.message || '同步渠道能力失败');
  }

  return {
    fetch: fetchResult,
    abilities: fixResult,
  };
}

export async function syncAllChannelAbilities() {
  const result = await syncChannelAbilities();
  if (!result.success) {
    throw new Error(result.message || '同步渠道能力失败');
  }
}
