export interface User {
  id: string;
  username: string;
  email: string | null;
  balance: number;
  created_at: string;
  provider?: string | null;
  new_api_user_id?: number | null;
  name?: string | null;
  image?: string | null;
  phone?: string | null;
  phone_verified_at?: string | null;
  two_factor_enabled?: boolean;
  two_factor_enabled_at?: string | null;
}

export interface Model {
  id: string;
  model_name: string;
  provider: string;
  category: string;
  description: string;
  input_price: number;
  output_price: number;
  context_length: number;
  description_zh?: string;
  description_en?: string;
  capabilities_zh?: string[];
  capabilities_en?: string[];
  source_url?: string;
  supported_endpoint_types?: string[];
  bound_channel_types?: number[];
  runtime_pricing_configured?: boolean;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_name: string;
  api_key: string;
  status: 'active' | 'disabled';
  created_at: string;
  last_used: string | null;
}

export interface UsageLog {
  id: string;
  user_id: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
