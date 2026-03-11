import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import modelsReducer from './slices/modelsSlice';
import dashboardReducer from './slices/dashboardSlice';
import playgroundReducer from './slices/playgroundSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    models: modelsReducer,
    dashboard: dashboardReducer,
    playground: playgroundReducer,
    notification: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
