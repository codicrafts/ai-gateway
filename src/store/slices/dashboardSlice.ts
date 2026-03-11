import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiKey, UsageLog } from '@/types';

interface DashboardState {
  apiKeys: ApiKey[];
  usageLogs: UsageLog[];
  monthlyRequests: number;
  monthlyCost: number;
  loading: boolean;
}

const initialState: DashboardState = {
  apiKeys: [],
  usageLogs: [],
  monthlyRequests: 0,
  monthlyCost: 0,
  loading: false,
};

export const fetchApiKeys = createAsyncThunk('dashboard/fetchApiKeys', async (userId: string) => {
  const response = await fetch(`/api/tables/api_keys?search=${userId}&limit=100`);
  const result = await response.json();
  return result.data as ApiKey[];
});

export const fetchUsageLogs = createAsyncThunk('dashboard/fetchUsageLogs', async (userId: string) => {
  const response = await fetch(`/api/tables/usage_logs?search=${userId}&limit=10&sort=-timestamp`);
  const result = await response.json();
  return result.data as UsageLog[];
});

export const createApiKey = createAsyncThunk('dashboard/createApiKey', async (newKey: ApiKey) => {
  const response = await fetch('/api/tables/api_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newKey),
  });
  if (!response.ok) throw new Error('创建失败');
  return newKey;
});

export const deleteApiKey = createAsyncThunk('dashboard/deleteApiKey', async (keyId: string) => {
  const response = await fetch(`/api/tables/api_keys/${keyId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('删除失败');
  return keyId;
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchApiKeys.fulfilled, (state, action) => { state.apiKeys = action.payload; })
      .addCase(fetchUsageLogs.fulfilled, (state, action) => {
        state.usageLogs = action.payload;
        const now = new Date();
        const thisMonth = action.payload.filter((log) => {
          const d = new Date(log.timestamp);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        state.monthlyRequests = thisMonth.length;
        state.monthlyCost = thisMonth.reduce((sum, l) => sum + (l.cost || 0), 0);
      })
      .addCase(createApiKey.fulfilled, (state, action) => { state.apiKeys.push(action.payload); })
      .addCase(deleteApiKey.fulfilled, (state, action) => {
        state.apiKeys = state.apiKeys.filter((k) => k.id !== action.payload);
      });
  },
});

export default dashboardSlice.reducer;
