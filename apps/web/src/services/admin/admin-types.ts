export interface AdminVendor {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  status: number;
  created_time: number;
  updated_time: number;
}

export interface AdminBoundChannel {
  name: string;
  type: number;
}

export interface AdminModelMeta {
  id: number;
  model_name: string;
  description?: string;
  icon?: string;
  tags?: string;
  vendor_id: number;
  endpoints?: string;
  status: number;
  sync_official: number;
  created_time: number;
  updated_time: number;
  bound_channels?: AdminBoundChannel[];
  enable_groups?: string[];
  quota_types?: number[];
  name_rule: number;
}

export interface AdminChannel {
  id: number;
  type: number;
  key: string;
  openai_organization?: string | null;
  test_model?: string | null;
  status: number;
  name: string;
  weight?: number | null;
  created_time: number;
  test_time: number;
  response_time: number;
  base_url?: string | null;
  other: string;
  balance: number;
  balance_updated_time: number;
  models: string;
  group: string;
  used_quota: number;
  model_mapping?: string | null;
  status_code_mapping?: string | null;
  priority?: number | null;
  auto_ban?: number | null;
  other_info: string;
  tag?: string | null;
  setting?: string | null;
  param_override?: string | null;
  header_override?: string | null;
  remark?: string | null;
  settings?: string;
}

export interface AdminOptionMap {
  retryTimes: number;
  automaticDisableChannelEnabled: boolean;
  automaticEnableChannelEnabled: boolean;
  channelDisableThreshold: number;
  channelAffinityTtlSeconds: number;
  automaticRetryStatusCodes: string;
  modelRequestRateLimitEnabled: boolean;
  modelRequestRateLimitCount: number;
  modelRequestRateLimitSuccessCount: number;
}

export interface AdminRouterOverview {
  settings: AdminOptionMap;
  channels: AdminChannel[];
}

export type AdminChannelFormInput = {
  id?: number;
  name: string;
  type: number;
  key: string;
  models: string;
  group: string;
  test_model?: string;
  base_url?: string;
  openai_organization?: string;
  other?: string;
  model_mapping?: string;
  status_code_mapping?: string;
  param_override?: string;
  header_override?: string;
  setting?: string;
  settings?: string;
  tag?: string;
  priority?: number;
  weight?: number;
  remark?: string;
  status: number;
  auto_ban: number;
};

export type AdminVendorFormInput = {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
  status: number;
};

export type AdminModelFormInput = {
  id?: number;
  model_name: string;
  description?: string;
  icon?: string;
  tags?: string;
  vendor_id: number;
  endpoints?: string;
  status: number;
  sync_official: number;
  name_rule: number;
};

export const CHANNEL_TYPE_OPTIONS = [
  { value: 1, label: 'OpenAI' },
  { value: 14, label: 'Anthropic Claude' },
  { value: 24, label: 'Google Gemini' },
  { value: 42, label: 'Mistral' },
  { value: 43, label: 'DeepSeek' },
  { value: 3, label: 'Azure OpenAI' },
  { value: 20, label: 'OpenRouter' },
  { value: 4, label: 'Ollama' },
  { value: 41, label: 'Vertex AI' },
  { value: 48, label: 'xAI' },
  { value: 40, label: 'SiliconFlow' },
];

export function getChannelTypeLabel(type: number): string {
  return CHANNEL_TYPE_OPTIONS.find((option) => option.value === type)?.label || `Type ${type}`;
}
