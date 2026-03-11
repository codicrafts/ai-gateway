import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

const initialState: NotificationState = {
  message: '',
  type: 'success',
  visible: false,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification(state, action: PayloadAction<{ message: string; type?: 'success' | 'error' }>) {
      state.message = action.payload.message;
      state.type = action.payload.type || 'success';
      state.visible = true;
    },
    hideNotification(state) {
      state.visible = false;
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
