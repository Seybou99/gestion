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
      
      // Chargement depuis la base locale filtrée par utilisateur
      const { getCurrentUser } = await import('../../utils/userInfo');
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ Utilisateur non connecté pour categories');
        return [];
      }
      
      const allowedOwners = currentUser.allowedOwnerIds || [currentUser.uid];
      const localCategories = await databaseService.getAllByUser('categories', allowedOwners) as Category[];
      console.log(`✅ [CATEGORY REDUX DEBUG] ${localCategories.length} catégories chargées pour l'utilisateur ${currentUser.email}`);
      
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
      console.log('🚀 [CATEGORY] Début createCategory');
      console.log('🚀 [CATEGORY] CategoryData reçu:', categoryData);

      const state = getState() as any;
      const isOnline = state.network.isConnected;
      console.log('🌐 [CATEGORY] État réseau:', isOnline ? 'EN LIGNE ✅' : 'HORS LIGNE ❌');

      // Générer les champs created_by et created_by_name
      const { getCurrentUser, generateCreatedByFields } = await import('../../utils/userInfo');
      const currentUser = await getCurrentUser();
      const createdByFields = await generateCreatedByFields();
      console.log('👤 [CATEGORY] Utilisateur créateur:', createdByFields);

      const categoryDataWithUser = { ...categoryData, ...createdByFields };

      // ✅ BONNE PRATIQUE : MODE EN LIGNE → ÉCRIRE DIRECTEMENT DANS FIREBASE
      if (isOnline) {
        console.log('🌐 [CATEGORY] MODE EN LIGNE : Création directe dans Firebase');
        
        try {
          // Créer directement dans Firebase
          const firebaseId = await firebaseService.createCategory(categoryDataWithUser);
          console.log('✅ [CATEGORY] Catégorie créée dans Firebase:', firebaseId);
          
          // Le listener temps réel mettra automatiquement à jour AsyncStorage
          // Pas besoin de création locale manuelle !
          
          return { 
            id: firebaseId,
            ...categoryData,
            ...createdByFields,
            sync_status: 'synced' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } catch (error) {
          console.error('❌ [CATEGORY] Erreur création Firebase:', error);
          // Si échec Firebase, basculer en mode offline
          console.log('⚠️ [CATEGORY] Basculement en mode offline après échec Firebase');
          // Continue vers le mode offline ci-dessous
        }
      }

      // ❌ MODE HORS LIGNE : CRÉER EN LOCAL ET AJOUTER À LA QUEUE
      console.log('📱 [CATEGORY] MODE HORS LIGNE : Création locale + queue de synchronisation');
      
      const id = await databaseService.insert('categories', {
        ...categoryData,
        ...createdByFields,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      console.log('✅ [CATEGORY] Catégorie créée localement:', id);
      
      // Ajouter à la queue de synchronisation
      await databaseService.insert('sync_queue', {
        table_name: 'categories',
        record_id: id,
        operation: 'create',
        data: JSON.stringify(categoryDataWithUser),
        priority: 1,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
      console.log('📋 [CATEGORY] Ajouté à la queue de synchronisation');

      return { 
        id, 
        ...categoryData,
        ...createdByFields,
        sync_status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [CATEGORY] Erreur createCategory:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la création de la catégorie');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, updates }: { id: string; updates: Partial<Category> }, { dispatch, getState, rejectWithValue }) => {
    try {
      console.log('🔄 [CATEGORY] Début updateCategory');
      console.log('🔄 [CATEGORY] ID:', id);
      console.log('🔄 [CATEGORY] Updates:', updates);

      const state = getState() as any;
      const isOnline = state.network.isConnected;
      console.log('🌐 [CATEGORY] État réseau:', isOnline ? 'EN LIGNE ✅' : 'HORS LIGNE ❌');

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // ✅ BONNE PRATIQUE : MODE EN LIGNE → METTRE À JOUR DIRECTEMENT FIREBASE
      if (isOnline) {
        console.log('🌐 [CATEGORY] MODE EN LIGNE : Mise à jour directe dans Firebase');
        
        try {
          await firebaseService.updateCategory(id, updates);
          console.log('✅ [CATEGORY] Catégorie mise à jour dans Firebase:', id);
          
          // Le listener temps réel mettra automatiquement à jour AsyncStorage
          return { id, ...updates };
        } catch (error) {
          console.error('❌ [CATEGORY] Erreur mise à jour Firebase:', error);
          console.log('⚠️ [CATEGORY] Basculement en mode offline après échec Firebase');
          // Continue vers le mode offline ci-dessous
        }
      }

      // ❌ MODE HORS LIGNE : METTRE À JOUR EN LOCAL ET AJOUTER À LA QUEUE
      console.log('📱 [CATEGORY] MODE HORS LIGNE : Mise à jour locale + queue');
      
      await databaseService.update('categories', id, {
        ...updateData,
        sync_status: 'pending',
      });
      console.log('✅ [CATEGORY] Catégorie mise à jour localement:', id);
      
      // Ajouter à la queue de synchronisation
      await databaseService.insert('sync_queue', {
        table_name: 'categories',
        record_id: id,
        operation: 'update',
        data: JSON.stringify(updates),
        priority: 1,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
      console.log('📋 [CATEGORY] Ajouté à la queue de synchronisation');

      return { id, ...updates };
    } catch (error) {
      console.error('❌ [CATEGORY] Erreur updateCategory:', error);
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
