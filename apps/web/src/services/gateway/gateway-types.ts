export interface GatewayApiKey {
  id: number;
  name: string;
  key: string;
  plain_key?: string | null;
  remark: string | null;
  subnet: string | null;
  permission_scopes: string[];
  last_full_key_viewed_at: string | null;
  status: 'active' | 'disabled' | 'expired' | 'exhausted';
  created_at: string;
  expires_at: string | null;
  quota: number;
  used_quota: number;
  unlimited_quota: boolean;
  models: string[];
}

export interface GatewayUsageLog {
  id: number;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  quota_cost: number;
  token_name: string;
  created_at: string;
}

export interface GatewayUsageStats {
  total_quota: number;
  used_quota: number;
  remaining_quota: number;
  request_count: number;
}

export interface CreateGatewayApiKeyInput {
  name: string;
  remark?: string | null;
  subnet?: string | null;
  permission_scopes?: string[];
  expires_at?: string | null;
  quota?: number;
  unlimited_quota?: boolean;
  models?: string[];
}

export interface UpdateGatewayApiKeyInput {
  id: number;
  name?: string;
  remark?: string | null;
  subnet?: string | null;
  permission_scopes?: string[];
  status?: 'active' | 'disabled';
  expires_at?: string | null;
  quota?: number;
  unlimited_quota?: boolean;
  models?: string[];
}
