import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { handleOfflineCategoryDelete } from '../../utils/offlineCategoryDeleteHandler';

// Interface pour une catégorie
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  sync_status: 'pending' | 'synced' | 'error';
  firebase_id?: string;
  created_at: string;
  updated_at: string;
}

// État initial du slice
interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  loadingAdd: boolean;
  loadingUpdate: boolean;
  loadingDelete: boolean;
  network: {
    isConnected: boolean;
  };
}

const initialState: CategoryState = {
  categories: [],
  loading: false,
  error: null,
  loadingAdd: false,
  loadingUpdate: false,
  loadingDelete: false,
  network: {
    isConnected: true, // Par défaut, on considère qu'on est connecté
  },
};

// Async thunks pour les catégories
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 [CATEGORY REDUX DEBUG] Début fetchCategories');
      
      // Chargement depuis la base locale
      const localCategories = await databaseService.getAll('categories') as Category[];
      console.log(`✅ [CATEGORY REDUX DEBUG] ${localCategories.length} catégories chargées localement`);
      
      return localCategories;
    } catch (error) {
      console.error('❌ [CATEGORY REDUX DEBUG] Erreur fetchCategories:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur de chargement des catégories');
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'sync_status'>, { dispatch, getState, rejectWithValue }) => {
    try {
      console.log('🚀 [CATEGORY REDUX DEBUG] Début createCategory');
      console.log('🚀 [CATEGORY REDUX DEBUG] CategoryData reçu:', categoryData);

      const state = getState() as any;
      console.log('🌐 [CATEGORY REDUX DEBUG] État réseau:', state.network.isConnected);

      // 1. CRÉATION LOCALE PRIORITAIRE
      console.log('📱 [CATEGORY REDUX DEBUG] Création locale prioritaire');
      console.log('🔄 [CATEGORY REDUX DEBUG] Appel databaseService.insert');
      
      const id = await databaseService.insert('categories', {
        ...categoryData,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      console.log('✅ [CATEGORY REDUX DEBUG] databaseService.insert terminé, ID:', id);
      console.log('✅ [CATEGORY REDUX DEBUG] Catégorie créée localement:', id);
      
      // En arrière-plan, essayer de synchroniser avec Firebase
      if (state.network.isConnected) {
        console.log('🔄 [CATEGORY REDUX DEBUG] Tentative sync Firebase en arrière-plan');
        firebaseService.createCategory(categoryData).then(firebaseId => {
          console.log('✅ [CATEGORY REDUX DEBUG] Sync Firebase réussie, ID:', firebaseId);
          // Mettre à jour le statut de sync ET le firebase_id
          databaseService.update('categories', id, { 
            sync_status: 'synced',
            firebase_id: firebaseId 
          });
        }).catch(error => {
          // Masquer les erreurs de timeout Firebase et mode offline
          if (error instanceof Error && error.message.includes('Timeout Firebase')) {
            console.log('⚠️ [CATEGORY REDUX DEBUG] Firebase timeout (normal), catégorie créée localement');
            // Ajouter à la queue de sync pour tentative ultérieure
            console.log('🔄 [CATEGORY REDUX DEBUG] Ajout à la queue de synchronisation');
            databaseService.insert('sync_queue', {
              table_name: 'categories',
              record_id: id,
              operation: 'create',
              data: JSON.stringify(categoryData),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          } else if (error instanceof Error && error.message.includes('Mode offline')) {
            console.log('📱 [CATEGORY REDUX DEBUG] Mode offline - catégorie créée localement (normal)');
            // Ajouter à la queue de sync pour tentative ultérieure
            databaseService.insert('sync_queue', {
              table_name: 'categories',
              record_id: id,
              operation: 'create',
              data: JSON.stringify(categoryData),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          } else {
            console.error('❌ [CATEGORY REDUX DEBUG] Erreur Firebase:', error);
            databaseService.update('categories', id, { sync_status: 'error' });
          }
        });
      }

      return { 
        id, 
        ...categoryData, 
        sync_status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [CATEGORY REDUX DEBUG] Erreur createCategory:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la création de la catégorie');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, updates }: { id: string; updates: Partial<Category> }, { dispatch, getState, rejectWithValue }) => {
    try {
      console.log('🔄 [CATEGORY REDUX DEBUG] Début updateCategory');
      console.log('🔄 [CATEGORY REDUX DEBUG] ID:', id);
      console.log('🔄 [CATEGORY REDUX DEBUG] Updates:', updates);

      const state = getState() as any;

      // 1. MISE À JOUR LOCALE PRIORITAIRE
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      await databaseService.update('categories', id, updateData);
      console.log('✅ [CATEGORY REDUX DEBUG] Catégorie mise à jour localement:', id);
      
      // En arrière-plan, essayer de synchroniser avec Firebase
      if (state.network.isConnected) {
        console.log('🔄 [CATEGORY REDUX DEBUG] Tentative sync Firebase en arrière-plan');
        firebaseService.updateCategory(id, updates).then(() => {
          console.log('✅ [CATEGORY REDUX DEBUG] Sync Firebase réussie');
          // Mettre à jour le statut de sync (le firebase_id existe déjà)
          databaseService.update('categories', id, { sync_status: 'synced' });
        }).catch(error => {
          // Masquer les erreurs de timeout Firebase et mode offline
          if (error instanceof Error && error.message.includes('Timeout Firebase')) {
            console.log('⚠️ [CATEGORY REDUX DEBUG] Firebase timeout (normal), catégorie mise à jour localement');
            // Ajouter à la queue de sync pour tentative ultérieure
            databaseService.insert('sync_queue', {
              table_name: 'categories',
              record_id: id,
              operation: 'update',
              data: JSON.stringify(updates),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          } else if (error instanceof Error && error.message.includes('Mode offline')) {
            console.log('📱 [CATEGORY REDUX DEBUG] Mode offline - catégorie mise à jour localement (normal)');
            // Ajouter à la queue de sync pour tentative ultérieure
            databaseService.insert('sync_queue', {
              table_name: 'categories',
              record_id: id,
              operation: 'update',
              data: JSON.stringify(updates),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          } else {
            console.error('❌ [CATEGORY REDUX DEBUG] Erreur Firebase:', error);
            databaseService.update('categories', id, { sync_status: 'error' });
          }
        });
      }

      return { id, ...updates };
    } catch (error) {
      console.error('❌ [CATEGORY REDUX DEBUG] Erreur updateCategory:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la catégorie');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { dispatch, getState }) => {
    try {
      console.log('🗑️ [CATEGORY REDUX DEBUG] Début deleteCategory');
      console.log('🗑️ [CATEGORY REDUX DEBUG] ID:', id);

      // Utiliser la fonction utilitaire pour gérer la suppression offline/online
      const success = await handleOfflineCategoryDelete(id);
      
      if (!success) {
        throw new Error('Échec de la suppression de la catégorie');
      }

      console.log('✅ [CATEGORY REDUX DEBUG] Catégorie supprimée avec succès:', id);
      return id;
    } catch (error) {
      console.error('❌ [CATEGORY REDUX DEBUG] Erreur deleteCategory:', error);
      throw error;
    }
  }
);

export const searchCategories = createAsyncThunk(
  'categories/searchCategories',
  async (query: string, { rejectWithValue }) => {
    try {
      const categories = await databaseService.getAll('categories') as Category[];
      const filteredCategories = categories.filter((category: Category) =>
        category.name.toLowerCase().includes(query.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      return filteredCategories;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur de recherche des catégories');
    }
  }
);

// Slice Redux
const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setNetworkStatus: (state, action: PayloadAction<boolean>) => {
      state.network.isConnected = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCategories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de chargement des catégories';
      })

      // createCategory
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création de la catégorie';
      })

      // updateCategory
      .addCase(updateCategory.pending, (state) => {
        state.loadingUpdate = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loadingUpdate = false;
        const index = state.categories.findIndex(cat => cat.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = { ...state.categories[index], ...action.payload };
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loadingUpdate = false;
        state.error = action.error.message || 'Erreur lors de la mise à jour de la catégorie';
      })

      // deleteCategory
      .addCase(deleteCategory.pending, (state) => {
        state.loadingDelete = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loadingDelete = false;
        state.categories = state.categories.filter(cat => cat.id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loadingDelete = false;
        state.error = action.error.message || 'Erreur lors de la suppression de la catégorie';
      })

      // searchCategories
      .addCase(searchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(searchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de recherche des catégories';
      });
  },
});

export const { setNetworkStatus, clearError, setLoading } = categorySlice.actions;
export default categorySlice.reducer;
