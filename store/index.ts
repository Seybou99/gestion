import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';

import authSlice from './slices/authSlice';
import categorySlice from './slices/categorySlice';
import customerSlice from './slices/customerSlice';
import networkSlice from './slices/networkSlice';
import productSlice from './slices/productSlice';
import salesSlice from './slices/salesSlice';
import stockMovementSlice from './slices/stockMovementSlice';
import stockSlice from './slices/stockSlice';
import syncSlice from './slices/syncSlice';

// Configuration de persistance
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'sync', 'network'], // Persister seulement l'auth, sync et network
  blacklist: ['products', 'categories', 'stock', 'sales', 'customers'], // Les données métier sont dans SQLite
};

// Configuration de persistance pour l'auth
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'isAuthenticated'], // Persister seulement l'utilisateur et le statut d'auth
};

// Configuration de persistance pour le sync
const syncPersistConfig = {
  key: 'sync',
  storage: AsyncStorage,
  whitelist: ['lastSync', 'isOnline', 'syncInProgress'], // Persister les métadonnées de sync
};

// Configuration de persistance pour le réseau
const networkPersistConfig = {
  key: 'network',
  storage: AsyncStorage,
  whitelist: ['isConnected', 'connectionType'], // Persister le statut de connexion
};

// Reducers avec persistance
const persistedAuthReducer = persistReducer(authPersistConfig, authSlice);
const persistedSyncReducer = persistReducer(syncPersistConfig, syncSlice);
const persistedNetworkReducer = persistReducer(networkPersistConfig, networkSlice);

// Configuration du store
export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    products: productSlice,
    categories: categorySlice,
    stock: stockSlice,
    stockMovement: stockMovementSlice,
    sales: salesSlice,
    customers: customerSlice,
    sync: persistedSyncReducer,
    network: persistedNetworkReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['_persist'],
      },
      immutableCheck: {
        ignoredPaths: ['_persist'],
      },
    }),
  devTools: __DEV__, // Activer Redux DevTools en développement
});

// Configuration du persistor
export const persistor = persistStore(store);

// Types TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks typés pour React Redux
export { useAppDispatch, useAppSelector } from './hooks';

// Fonction pour réinitialiser le store (utile pour les tests)
export const resetStore = () => {
  persistor.purge();
  store.dispatch({ type: 'RESET' });
};
