import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@ai-gateway/shared-types';

interface AuthState {
  currentUser: User | null;
  isLoggedIn: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  currentUser: null,
  isLoggedIn: false,
  loading: false,
};

export const fetchCurrentUser = createAsyncThunk<User | null, void, { rejectValue: string }>(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/account/session');
      if (response.status === 401) {
        return null;
      }

      const result = await response.json();
      if (!result.success) {
        return rejectWithValue(result.error || '获取用户信息失败');
      }

      return result.data as User;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '网络错误');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.currentUser = action.payload;
      state.isLoggedIn = Boolean(action.payload);
    },
    logout(state) {
      state.currentUser = null;
      state.isLoggedIn = false;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.isLoggedIn = Boolean(action.payload);
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.currentUser = null;
        state.isLoggedIn = false;
      });
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
