import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  isLoggedIn: boolean;
}

const initialState: AuthState = {
  currentUser: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.currentUser = action.payload;
      state.isLoggedIn = true;
    },
    logout(state) {
      state.currentUser = null;
      state.isLoggedIn = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
      }
    },
    loadUserFromStorage(state) {
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('currentUser');
        if (user) {
          state.currentUser = JSON.parse(user);
          state.isLoggedIn = true;
        }
      }
    },
  },
});

export const { setUser, logout, loadUserFromStorage } = authSlice.actions;
export default authSlice.reducer;
