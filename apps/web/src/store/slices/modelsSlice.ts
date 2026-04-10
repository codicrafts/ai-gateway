import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Model } from '@ai-gateway/shared-types';

interface ModelsState {
  models: Model[];
  loading: boolean;
  searchTerm: string;
  providerFilter: string;
  categoryFilter: string;
  priceFilter: string;
  capabilityFilter: string;
  sortFilter: string;
}

const initialState: ModelsState = {
  models: [],
  loading: false,
  searchTerm: '',
  providerFilter: '',
  categoryFilter: '',
  priceFilter: '',
  capabilityFilter: '',
  sortFilter: 'name',
};

export const fetchModels = createAsyncThunk('models/fetchModels', async (params?: { limit?: number; category?: string }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.category) query.set('category', params.category);
  const response = await fetch(`/api/catalog/models?${query.toString()}`);
  const result = await response.json();
  return result.data as Model[];
});

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    hydrateModels(state, action: PayloadAction<Model[]>) {
      state.models = action.payload;
      state.loading = false;
    },
    setSearchTerm(state, action: PayloadAction<string>) { state.searchTerm = action.payload; },
    setProviderFilter(state, action: PayloadAction<string>) { state.providerFilter = action.payload; },
    setCategoryFilter(state, action: PayloadAction<string>) { state.categoryFilter = action.payload; },
    setPriceFilter(state, action: PayloadAction<string>) { state.priceFilter = action.payload; },
    setCapabilityFilter(state, action: PayloadAction<string>) { state.capabilityFilter = action.payload; },
    setSortFilter(state, action: PayloadAction<string>) { state.sortFilter = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => { state.loading = true; })
      .addCase(fetchModels.fulfilled, (state, action) => { state.models = action.payload; state.loading = false; })
      .addCase(fetchModels.rejected, (state) => { state.loading = false; });
  },
});

export const {
  hydrateModels,
  setSearchTerm,
  setProviderFilter,
  setCategoryFilter,
  setPriceFilter,
  setCapabilityFilter,
  setSortFilter,
} = modelsSlice.actions;
export default modelsSlice.reducer;
