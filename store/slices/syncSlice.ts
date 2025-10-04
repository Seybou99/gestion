import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncState {
  isOnline: boolean;
  syncInProgress: boolean;
  lastSync: string | null;
  syncErrors: string[];
  pendingOperations: number;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
}

const initialState: SyncState = {
  isOnline: true,
  syncInProgress: false,
  lastSync: null,
  syncErrors: [],
  pendingOperations: 0,
  syncStatus: 'idle',
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
      state.syncStatus = action.payload ? 'syncing' : 'idle';
    },
    
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
      state.syncStatus = 'success';
    },
    
    addSyncError: (state, action: PayloadAction<string>) => {
      state.syncErrors.push(action.payload);
      state.syncStatus = 'error';
    },
    
    clearSyncErrors: (state) => {
      state.syncErrors = [];
      state.syncStatus = 'idle';
    },
    
    setPendingOperations: (state, action: PayloadAction<number>) => {
      state.pendingOperations = action.payload;
    },
    
    incrementPendingOperations: (state) => {
      state.pendingOperations += 1;
    },
    
    decrementPendingOperations: (state) => {
      state.pendingOperations = Math.max(0, state.pendingOperations - 1);
    },
    
    resetSync: (state) => {
      state.isOnline = true;
      state.syncInProgress = false;
      state.lastSync = null;
      state.syncErrors = [];
      state.pendingOperations = 0;
      state.syncStatus = 'idle';
    },
  },
});

export const {
  setOnlineStatus,
  setSyncInProgress,
  setLastSync,
  addSyncError,
  clearSyncErrors,
  setPendingOperations,
  incrementPendingOperations,
  decrementPendingOperations,
  resetSync,
} = syncSlice.actions;

export default syncSlice.reducer;
