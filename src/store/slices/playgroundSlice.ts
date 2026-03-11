import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '@/types';

interface PlaygroundState {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  systemMessage: string;
  selectedModel: string;
  totalTokens: number;
  sending: boolean;
}

const initialState: PlaygroundState = {
  messages: [],
  temperature: 0.7,
  maxTokens: 1000,
  systemMessage: 'You are a helpful assistant.',
  selectedModel: '',
  totalTokens: 0,
  sending: false,
};

const playgroundSlice = createSlice({
  name: 'playground',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
      state.totalTokens += Math.ceil(action.payload.content.length / 4);
    },
    clearMessages(state) {
      state.messages = [];
      state.totalTokens = 0;
    },
    setTemperature(state, action: PayloadAction<number>) { state.temperature = action.payload; },
    setMaxTokens(state, action: PayloadAction<number>) { state.maxTokens = action.payload; },
    setSystemMessage(state, action: PayloadAction<string>) { state.systemMessage = action.payload; },
    setSelectedModel(state, action: PayloadAction<string>) { state.selectedModel = action.payload; },
    setSending(state, action: PayloadAction<boolean>) { state.sending = action.payload; },
  },
});

export const { addMessage, clearMessages, setTemperature, setMaxTokens, setSystemMessage, setSelectedModel, setSending } = playgroundSlice.actions;
export default playgroundSlice.reducer;
