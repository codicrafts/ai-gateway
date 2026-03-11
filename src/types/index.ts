export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  balance: number;
  created_at: string;
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
