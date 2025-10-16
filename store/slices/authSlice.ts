import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Type User local (plus besoin de services/api)
interface User {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoURL?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  lastLogin: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  isAuthenticated: false,
  error: null,
  lastLogin: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (action.payload) {
        state.lastLogin = new Date().toISOString();
      }
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.lastLogin = null;
    },
    
    resetAuth: (state) => {
      state.user = null;
      state.loading = false;
      state.isAuthenticated = false;
      state.error = null;
      state.lastLogin = null;
    },
  },
});

export const {
  setUser,
  setLoading,
  setError,
  clearError,
  logout,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;
