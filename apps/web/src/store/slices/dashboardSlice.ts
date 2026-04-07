import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Model } from '@ai-gateway/shared-types';

// API Key 类型（与 New API Token 对应）
export interface ApiKey {
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

// 用量日志类型
export interface UsageLog {
  id: number;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  quota_cost: number;
  token_name: string;
  created_at: string;
}

// 用量统计类型
export interface UsageStats {
  total_quota: number;
  used_quota: number;
  remaining_quota: number;
  request_count: number;
}

export interface BillingEntry {
  id: string;
  type: 'usage' | 'recharge';
  title: string;
  description: string;
  amount: number;
  created_at: string;
  status: 'settled';
  model?: string;
  token_name?: string;
  total_tokens?: number;
  currency?: 'CNY' | 'USD';
  reference?: string;
}

export interface BillingSummary {
  current_balance: number;
  current_month_spend: number;
  previous_month_spend: number;
  change_percentage: number | null;
  average_daily_spend: number;
  estimated_available_days: number | null;
  recent_entries: BillingEntry[];
  currency: 'USD';
}

export type PaymentMethod = 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal';
export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';

export interface PaymentOrder {
  id: string;
  payment_method: PaymentMethod;
  payment_region: 'domestic' | 'international';
  currency: 'CNY' | 'USD';
  amount: number;
  status: PaymentOrderStatus;
  fulfillment_status: 'pending' | 'processing' | 'applied' | 'failed';
  checkout_reference: string;
  external_order_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  fulfilled_at: string | null;
  fulfilled_amount: number | null;
  fulfilled_new_api_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSnapshot {
  apiKeys: ApiKey[];
  availableModels: Model[];
  usageLogs: UsageLog[];
  usageStats: UsageStats | null;
  billingSummary: BillingSummary;
  paymentOrders: PaymentOrder[];
}

interface DashboardState {
  apiKeys: ApiKey[];
  availableModels: Model[];
  usageLogs: UsageLog[];
  usageStats: UsageStats | null;
  billingSummary: BillingSummary | null;
  paymentOrders: PaymentOrder[];
  monthlyRequests: number;
  monthlyCost: number;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  apiKeys: [],
  availableModels: [],
  usageLogs: [],
  usageStats: null,
  billingSummary: null,
  paymentOrders: [],
  monthlyRequests: 0,
  monthlyCost: 0,
  loading: false,
  error: null,
};

// 获取 API Key 列表
export const fetchApiKeys = createAsyncThunk(
  'dashboard/fetchApiKeys',
  async (teamId: string | null | undefined, { rejectWithValue }) => {
    try {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      const response = await fetch(`/api/gateway/keys${query}`);
      const result = await response.json();
      
      if (!result.success) {
        return rejectWithValue(result.error || '获取 API Key 列表失败');
      }
      
      return result.data as ApiKey[];
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

// 获取用量日志
export const fetchUsageLogs = createAsyncThunk(
  'dashboard/fetchUsageLogs',
  async (teamId: string | null | undefined, { rejectWithValue }) => {
    try {
      const query = teamId ? `?limit=50&team_id=${encodeURIComponent(teamId)}` : '?limit=50';
      const response = await fetch(`/api/gateway/usage${query}`);
      const result = await response.json();
      
      if (!result.success) {
        return rejectWithValue(result.error || '获取用量日志失败');
      }
      
      return {
        logs: result.data.logs as UsageLog[],
        stats: result.data.stats as UsageStats | null,
      };
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

export const fetchBillingSummary = createAsyncThunk(
  'dashboard/fetchBillingSummary',
  async (teamId: string | null | undefined, { rejectWithValue }) => {
    try {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      const response = await fetch(`/api/billing/summary${query}`);
      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error || '获取账单摘要失败');
      }

      return result.data as BillingSummary;
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

export const fetchPaymentOrders = createAsyncThunk(
  'dashboard/fetchPaymentOrders',
  async (teamId: string | null | undefined, { rejectWithValue }) => {
    try {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      const response = await fetch(`/api/billing/payment-orders${query}`);
      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error || '获取充值订单失败');
      }

      return result.data as PaymentOrder[];
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

export interface CreatePaymentOrderRequest {
  team_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
}

export const createPaymentOrder = createAsyncThunk(
  'dashboard/createPaymentOrder',
  async (request: CreatePaymentOrderRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/billing/payment-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error || '创建充值订单失败');
      }

      return result.data as PaymentOrder;
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

export const confirmPaymentOrder = createAsyncThunk(
  'dashboard/confirmPaymentOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/billing/payment-orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!result.success) {
        return rejectWithValue(result.error || '确认充值订单失败');
      }

      return result.data as PaymentOrder;
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

// 创建 API Key 请求类型
export interface CreateApiKeyRequest {
  team_id?: string | null;
  name: string;
  remark?: string | null;
  subnet?: string | null;
  permission_scopes?: string[];
  expires_at?: string | null;
  quota?: number;
  unlimited_quota?: boolean;
  models?: string[];
}

// 创建 API Key
export const createApiKey = createAsyncThunk(
  'dashboard/createApiKey',
  async (request: CreateApiKeyRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/gateway/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return rejectWithValue(result.error || '创建 API Key 失败');
      }
      
      return result.data as ApiKey;
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

// 更新 API Key 请求类型
export interface UpdateApiKeyRequest {
  id: number;
  team_id?: string | null;
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

export interface FetchApiKeySecretRequest {
  id: number;
  team_id?: string | null;
}

// 更新 API Key
export const updateApiKey = createAsyncThunk(
  'dashboard/updateApiKey',
  async (request: UpdateApiKeyRequest, { rejectWithValue }) => {
    try {
      const { id, ...data } = request;
      const query = request.team_id ? `?team_id=${encodeURIComponent(request.team_id)}` : '';
      const response = await fetch(`/api/gateway/keys/${id}${query}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return rejectWithValue(result.error || '更新 API Key 失败');
      }
      
      return request;
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

// 删除 API Key
export const deleteApiKey = createAsyncThunk(
  'dashboard/deleteApiKey',
  async ({ keyId, teamId }: { keyId: number; teamId?: string | null }, { rejectWithValue }) => {
    try {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      const response = await fetch(`/api/gateway/keys/${keyId}${query}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return rejectWithValue(result.error || '删除 API Key 失败');
      }
      
      return keyId;
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

export const fetchApiKeySecret = createAsyncThunk(
  'dashboard/fetchApiKeySecret',
  async (request: FetchApiKeySecretRequest, { rejectWithValue }) => {
    try {
      const query = request.team_id ? `?team_id=${encodeURIComponent(request.team_id)}` : '';
      const response = await fetch(`/api/gateway/keys/${request.id}/key${query}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success || !result.data?.key) {
        return rejectWithValue(result.error || '获取完整 API Key 失败');
      }

      return {
        id: request.id,
        plain_key: result.data.key as string,
      };
    } catch {
      return rejectWithValue('网络错误');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    hydrateDashboardSnapshot: (state, action: { payload: DashboardSnapshot }) => {
      state.loading = false;
      state.error = null;
      state.apiKeys = action.payload.apiKeys;
      state.availableModels = action.payload.availableModels;
      state.usageLogs = action.payload.usageLogs;
      state.usageStats = action.payload.usageStats;
      state.billingSummary = action.payload.billingSummary;
      state.paymentOrders = action.payload.paymentOrders;

      const now = new Date();
      const thisMonthLogs = action.payload.usageLogs.filter((log) => {
        const d = new Date(log.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      state.monthlyRequests = thisMonthLogs.length;
      state.monthlyCost = thisMonthLogs.reduce((sum, log) => sum + (log.quota_cost || 0), 0);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchApiKeys
      .addCase(fetchApiKeys.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApiKeys.fulfilled, (state, action) => {
        state.loading = false;
        state.apiKeys = action.payload;
      })
      .addCase(fetchApiKeys.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchUsageLogs
      .addCase(fetchUsageLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsageLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.usageLogs = action.payload.logs;
        state.usageStats = action.payload.stats;
        
        // 计算本月统计
        const now = new Date();
        const thisMonthLogs = action.payload.logs.filter((log) => {
          const d = new Date(log.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        state.monthlyRequests = thisMonthLogs.length;
        state.monthlyCost = thisMonthLogs.reduce((sum, l) => sum + (l.quota_cost || 0), 0);
      })
      .addCase(fetchUsageLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchBillingSummary
      .addCase(fetchBillingSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBillingSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.billingSummary = action.payload;
      })
      .addCase(fetchBillingSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchPaymentOrders
      .addCase(fetchPaymentOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentOrders = action.payload;
      })
      .addCase(fetchPaymentOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createPaymentOrder
      .addCase(createPaymentOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPaymentOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentOrders = [action.payload, ...state.paymentOrders];
      })
      .addCase(createPaymentOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // confirmPaymentOrder
      .addCase(confirmPaymentOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmPaymentOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.paymentOrders.findIndex((order) => order.id === action.payload.id);
        if (index !== -1) {
          state.paymentOrders[index] = action.payload;
        }
      })
      .addCase(confirmPaymentOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createApiKey
      .addCase(createApiKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApiKey.fulfilled, (state, action) => {
        state.loading = false;
        state.apiKeys.push(action.payload);
      })
      .addCase(createApiKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateApiKey
      .addCase(updateApiKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateApiKey.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.apiKeys.findIndex((k) => k.id === action.payload.id);
        if (index !== -1) {
          state.apiKeys[index] = { ...state.apiKeys[index], ...action.payload };
        }
      })
      .addCase(updateApiKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteApiKey
      .addCase(deleteApiKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteApiKey.fulfilled, (state, action) => {
        state.loading = false;
        state.apiKeys = state.apiKeys.filter((k) => k.id !== action.payload);
      })
      .addCase(deleteApiKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchApiKeySecret
      .addCase(fetchApiKeySecret.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApiKeySecret.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.apiKeys.findIndex((k) => k.id === action.payload.id);
        if (index !== -1) {
          state.apiKeys[index] = {
            ...state.apiKeys[index],
            plain_key: action.payload.plain_key,
          };
        }
      })
      .addCase(fetchApiKeySecret.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, hydrateDashboardSnapshot } = dashboardSlice.actions;
export default dashboardSlice.reducer;
