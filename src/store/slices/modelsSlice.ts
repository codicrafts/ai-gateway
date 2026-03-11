import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Model } from '@/types';

interface ModelsState {
  models: Model[];
  loading: boolean;
  searchTerm: string;
  providerFilter: string;
  categoryFilter: string;
  sortFilter: string;
}

const initialState: ModelsState = {
  models: [],
  loading: false,
  searchTerm: '',
  providerFilter: '',
  categoryFilter: '',
  sortFilter: 'name',
};

export const fetchModels = createAsyncThunk('models/fetchModels', async (params?: { limit?: number; category?: string }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.category) query.set('category', params.category);
  const response = await fetch(`/api/tables/models?${query.toString()}`);
  const result = await response.json();
  return result.data as Model[];
});

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) { state.searchTerm = action.payload; },
    setProviderFilter(state, action: PayloadAction<string>) { state.providerFilter = action.payload; },
    setCategoryFilter(state, action: PayloadAction<string>) { state.categoryFilter = action.payload; },
    setSortFilter(state, action: PayloadAction<string>) { state.sortFilter = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => { state.loading = true; })
      .addCase(fetchModels.fulfilled, (state, action) => { state.models = action.payload; state.loading = false; })
      .addCase(fetchModels.rejected, (state) => { state.loading = false; });
  },
});

export const { setSearchTerm, setProviderFilter, setCategoryFilter, setSortFilter } = modelsSlice.actions;
export default modelsSlice.reducer;
