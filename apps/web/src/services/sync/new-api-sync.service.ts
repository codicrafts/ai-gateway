import type { AdminChannelFormInput } from '@/services/admin/admin-types';
import {
  createAdminChannel,
  removeAdminChannel,
  updateAdminChannel,
} from '@/services/admin/provider-admin.service';
import {
  createSyncJob,
  updateSyncJob,
} from './sync-job.service';
import {
  type EnterpriseChannelConfig,
  updateEnterpriseChannelSyncState,
} from '@/services/enterprise-config/channel-config.service';

function toAdminChannelForm(config: EnterpriseChannelConfig): AdminChannelFormInput {
  const payload = (config.config_payload || {}) as Record<string, unknown>;

  return {
    name: config.name,
    type: config.provider_type,
    key: '',
    models: config.models,
    group: config.group_name,
    test_model: typeof config.test_model === 'string' ? config.test_model : '',
    base_url: typeof config.base_url === 'string' ? config.base_url : '',
    openai_organization: typeof payload.openai_organization === 'string' ? payload.openai_organization : '',
    other: typeof payload.other === 'string' ? payload.other : '',
    model_mapping: typeof payload.model_mapping === 'string' ? payload.model_mapping : '',
    status_code_mapping: typeof payload.status_code_mapping === 'string' ? payload.status_code_mapping : '',
    param_override: typeof payload.param_override === 'string' ? payload.param_override : '',
    header_override: typeof payload.header_override === 'string' ? payload.header_override : '',
    setting: typeof payload.setting === 'string' ? payload.setting : '',
    settings: typeof payload.settings === 'string' ? payload.settings : '',
    tag: typeof config.tag === 'string' ? config.tag : '',
    priority: config.priority,
    weight: config.weight,
    remark: typeof payload.remark === 'string' ? payload.remark : '',
    status: config.status === 'active' ? 1 : 2,
    auto_ban: config.auto_ban ? 1 : 0,
  };
}

export async function syncEnterpriseChannelToNewApi(config: EnterpriseChannelConfig) {
  const job = await createSyncJob({
    entity_type: 'channel',
    entity_id: config.id,
    action: config.new_api_channel_id ? 'update' : 'create',
    status: 'processing',
    request_payload: {
      enterprise_channel_id: config.id,
      team_id: config.team_id,
      provider_type: config.provider_type,
    },
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
  });

  try {
    await updateEnterpriseChannelSyncState(config.id, {
      syncStatus: 'syncing',
      syncError: null,
    });

    const payload = toAdminChannelForm(config);
    let newApiChannelId = config.new_api_channel_id;

    if (config.new_api_channel_id) {
      await updateAdminChannel({
        ...payload,
        id: config.new_api_channel_id,
      });
    } else {
      await createAdminChannel(payload);
      // 当前 new-api 创建接口未稳定返回 id，这里先保留空映射，后续可在 provider-admin.service 层补返回值。
      newApiChannelId = config.new_api_channel_id;
    }

    await updateEnterpriseChannelSyncState(config.id, {
      syncStatus: 'synced',
      syncError: null,
      newApiChannelId,
      syncedAt: new Date().toISOString(),
    });

    await updateSyncJob(job.id, {
      status: 'completed',
      response_payload: {
        synced: true,
        new_api_channel_id: newApiChannelId,
      },
      last_attempt_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '渠道同步失败';

    await updateEnterpriseChannelSyncState(config.id, {
      syncStatus: 'failed',
      syncError: message,
    });

    await updateSyncJob(job.id, {
      status: 'failed',
      error_message: message,
      response_payload: { synced: false },
      last_attempt_at: new Date().toISOString(),
    });

    throw error;
  }
}

export async function deleteEnterpriseChannelFromNewApi(config: EnterpriseChannelConfig) {
  if (!config.new_api_channel_id) {
    return;
  }

  const job = await createSyncJob({
    entity_type: 'channel',
    entity_id: config.id,
    action: 'delete',
    status: 'processing',
    request_payload: {
      enterprise_channel_id: config.id,
      new_api_channel_id: config.new_api_channel_id,
    },
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
  });

  try {
    await removeAdminChannel(config.new_api_channel_id);

    await updateEnterpriseChannelSyncState(config.id, {
      syncStatus: 'synced',
      syncError: null,
      newApiChannelId: null,
      syncedAt: new Date().toISOString(),
    });

    await updateSyncJob(job.id, {
      status: 'completed',
      response_payload: { deleted: true },
      last_attempt_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除运行时渠道失败';
    await updateEnterpriseChannelSyncState(config.id, {
      syncStatus: 'failed',
      syncError: message,
    });
    await updateSyncJob(job.id, {
      status: 'failed',
      error_message: message,
      response_payload: { deleted: false },
      last_attempt_at: new Date().toISOString(),
    });
    throw error;
  }
}
