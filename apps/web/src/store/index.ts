import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import modelsReducer from './slices/modelsSlice';
import dashboardReducer from './slices/dashboardSlice';
import playgroundReducer from './slices/playgroundSlice';
import notificationReducer from './slices/notificationSlice';
import localeReducer from './slices/localeSlice';
import teamReducer from './slices/teamSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  models: modelsReducer,
  dashboard: dashboardReducer,
  playground: playgroundReducer,
  notification: notificationReducer,
  locale: localeReducer,
  team: teamReducer,
});

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
