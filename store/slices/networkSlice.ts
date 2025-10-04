import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  isConnected: boolean;
  connectionType: string | null;
  isInternetReachable: boolean | null;
  lastConnected: string | null;
  lastDisconnected: string | null;
}

const initialState: NetworkState = {
  isConnected: true, // Assume connected by default
  connectionType: null,
  isInternetReachable: null,
  lastConnected: null,
  lastDisconnected: null,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<{
      isConnected: boolean;
      connectionType?: string | null;
      isInternetReachable?: boolean | null;
    }>) => {
      const { isConnected, connectionType, isInternetReachable } = action.payload;
      
      const wasConnected = state.isConnected;
      state.isConnected = isConnected;
      state.connectionType = connectionType || state.connectionType;
      state.isInternetReachable = isInternetReachable !== undefined ? isInternetReachable : state.isInternetReachable;
      
      // Mettre à jour les timestamps
      if (isConnected && !wasConnected) {
        state.lastConnected = new Date().toISOString();
      } else if (!isConnected && wasConnected) {
        state.lastDisconnected = new Date().toISOString();
      }
    },
    
    setConnectionType: (state, action: PayloadAction<string | null>) => {
      state.connectionType = action.payload;
    },
    
    setInternetReachability: (state, action: PayloadAction<boolean | null>) => {
      state.isInternetReachable = action.payload;
    },
    
    resetNetwork: (state) => {
      state.isConnected = true;
      state.connectionType = null;
      state.isInternetReachable = null;
      state.lastConnected = null;
      state.lastDisconnected = null;
    },
  },
});

export const {
  setConnectionStatus,
  setConnectionType,
  setInternetReachability,
  resetNetwork,
} = networkSlice.actions;

export default networkSlice.reducer;
