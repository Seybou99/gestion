import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { handleOfflineDelete } from '../../utils/offlineDeleteHandler';

// Types locaux pour éviter les conflits
interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id?: string;
  price_buy: number;
  price_sell: number;
  margin: number;
  unit: string;
  images?: string[];
  is_active: boolean;
  created_at: any;
  updated_at: any;
  sync_status: 'synced' | 'pending' | 'error';
}

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
  offlineMode: boolean;
  searchQuery: string;
  selectedCategory: string;
  sortBy: 'name' | 'price' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

const initialState: ProductState = {
  products: [],
  loading: false,
  error: null,
  lastSync: null,
  offlineMode: false,
  searchQuery: '',
  selectedCategory: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
};

// Thunks pour les opérations async
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { getState, dispatch }) => {
    const state = getState() as { network: { isConnected: boolean } };
    
    try {
      // OPTIMISATION : Toujours charger local d'abord pour un affichage rapide
      console.log('⚡ Chargement rapide des produits locaux...');
      const localProducts = await databaseService.getAll('products');
      
      // Toujours retourner les produits locaux immédiatement
      console.log(`⚡ ${localProducts.length} produits locaux chargés instantanément`);
      dispatch(setOfflineMode(true));
      
      // En arrière-plan, essayer de synchroniser avec Firebase si en ligne
      if (state.network.isConnected) {
        console.log('🔄 Synchronisation en arrière-plan...');
        // Ne pas attendre Firebase, laisser tourner en arrière-plan
        firebaseService.getProducts().then(firebaseProducts => {
          if (firebaseProducts.length > 0) {
            console.log(`🔄 ${firebaseProducts.length} produits Firebase récupérés en arrière-plan`);
            dispatch(setOfflineMode(false));
            dispatch(setLastSync(new Date().toISOString()));
            // Optionnel: mettre à jour les produits si nécessaire
          }
        }).catch(error => {
          // Masquer les erreurs de timeout Firebase
          if (error instanceof Error && error.message.includes('Timeout Firebase')) {
            console.log('⚠️ Firebase timeout (normal), utilisation des données locales');
          } else {
            console.log('⚠️ Sync Firebase échouée en arrière-plan, utilisation des données locales');
          }
        });
      }
      
      return localProducts;
      
      // Si pas de données locales, essayer Firebase
      if (state.network.isConnected) {
        try {
          const products = await firebaseService.getProducts();
          dispatch(setLastSync(new Date().toISOString()));
          dispatch(setOfflineMode(false));
          return products;
        } catch (error) {
          console.error('Erreur récupération Firebase:', error);
          dispatch(setOfflineMode(true));
          return [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('Erreur fetchProducts:', error);
      throw error;
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sync_status'>, { dispatch, getState }) => {
    console.log('🚀 [REDUX DEBUG] Début createProduct');
    console.log('🚀 [REDUX DEBUG] ProductData reçu:', productData);
    
    try {
      const state = getState() as { network: { isConnected: boolean } };
      console.log('🌐 [REDUX DEBUG] État réseau:', state.network.isConnected);
      
      // TOUJOURS créer localement d'abord pour éviter les blocages
      console.log('📱 [REDUX DEBUG] Création locale prioritaire');
      const newProduct: Omit<Product, 'id'> = {
        ...productData,
        created_at: new Date().toISOString() as any,
        updated_at: new Date().toISOString() as any,
        sync_status: 'pending',
      };

      console.log('🔄 [REDUX DEBUG] Appel databaseService.insert');
      const id = await databaseService.insert('products', newProduct);
      console.log('✅ [REDUX DEBUG] databaseService.insert terminé, ID:', id);
      
      const createdProduct = { ...newProduct, id };
          console.log('✅ [REDUX DEBUG] Produit créé localement:', id);
          
          // En arrière-plan, essayer de synchroniser avec Firebase
          if (state.network.isConnected) {
            console.log('🔄 [REDUX DEBUG] Tentative sync Firebase en arrière-plan');
            firebaseService.createProduct(productData).then(firebaseId => {
              console.log('✅ [REDUX DEBUG] Sync Firebase réussie, ID:', firebaseId);
              // Mettre à jour le statut de sync
              databaseService.update('products', id, { sync_status: 'synced' });
            }).catch(error => {
              // Masquer les erreurs de timeout Firebase et mode offline
              if (error instanceof Error && error.message.includes('Timeout Firebase')) {
                console.log('⚠️ [REDUX DEBUG] Firebase timeout (normal), produit créé localement');
                // Ajouter à la queue de sync pour tentative ultérieure
                console.log('🔄 [REDUX DEBUG] Ajout à la queue de synchronisation');
                databaseService.insert('sync_queue', {
                  table_name: 'products',
                  record_id: id,
                  operation: 'create',
                  data: JSON.stringify(productData),
                  priority: 1,
                  status: 'pending',
                  retry_count: 0,
                  created_at: new Date().toISOString(),
                });
              } else if (error instanceof Error && error.message.includes('Mode offline')) {
                console.log('📱 [REDUX DEBUG] Mode offline - produit créé localement (normal)');
                // Ajouter à la queue de sync pour quand on repassera en ligne
                console.log('🔄 [REDUX DEBUG] Ajout à la queue de synchronisation pour mode offline');
                databaseService.insert('sync_queue', {
                  table_name: 'products',
                  record_id: id,
                  operation: 'create',
                  data: JSON.stringify(productData),
                  priority: 1,
                  status: 'pending',
                  retry_count: 0,
                  created_at: new Date().toISOString(),
                });
              } else {
                console.log('⚠️ [REDUX DEBUG] Sync Firebase échouée:', error.message);
                // Ajouter à la queue de sync pour tentative ultérieure
                console.log('🔄 [REDUX DEBUG] Ajout à la queue de synchronisation');
                databaseService.insert('sync_queue', {
                  table_name: 'products',
                  record_id: id,
                  operation: 'create',
                  data: JSON.stringify(productData),
                  priority: 1,
                  status: 'pending',
                  retry_count: 0,
                  created_at: new Date().toISOString(),
                });
              }
            });
          } else {
            // Mode offline - ajouter directement à la queue de sync
            console.log('📱 [REDUX DEBUG] Mode offline - ajout à la queue de synchronisation');
            databaseService.insert('sync_queue', {
              table_name: 'products',
              record_id: id,
              operation: 'create',
              data: JSON.stringify(productData),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          }
      
      return createdProduct;
    } catch (error) {
      console.error('❌ [REDUX DEBUG] Erreur createProduct:', error);
      console.error('❌ [REDUX DEBUG] Stack trace:', error.stack);
      throw error;
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ id, productData }: { id: string; productData: Partial<Product> }, { dispatch, getState }) => {
    const state = getState() as { network: { isConnected: boolean } };
    
    try {
      console.log('🔄 [REDUX DEBUG] Début updateProduct');
      console.log('🔄 [REDUX DEBUG] ID:', id);
      console.log('🔄 [REDUX DEBUG] ProductData:', productData);

      // Mettre à jour localement en priorité
      const updateData = {
        ...productData,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      console.log('🔄 [REDUX DEBUG] Mise à jour locale...');
      await databaseService.update('products', id, updateData);
      
      // Récupérer le produit mis à jour
      const products = await databaseService.getAll('products');
      const updatedProduct = products.find((p: any) => p.id === id);
      
      if (!updatedProduct) {
        throw new Error('Produit non trouvé après mise à jour');
      }

      console.log('✅ [REDUX DEBUG] Produit mis à jour localement:', id);
      
      // En arrière-plan, essayer de synchroniser avec Firebase
      if (state.network.isConnected) {
        console.log('🔄 [REDUX DEBUG] Tentative sync Firebase en arrière-plan');
        firebaseService.updateProduct(id, productData).then(() => {
          console.log('✅ [REDUX DEBUG] Sync Firebase réussie');
          // Mettre à jour le statut de sync
          databaseService.update('products', id, { sync_status: 'synced' });
        }).catch(error => {
          // Masquer les erreurs de timeout Firebase et mode offline
          if (error instanceof Error && error.message.includes('Timeout Firebase')) {
            console.log('⚠️ [REDUX DEBUG] Firebase timeout (normal), produit mis à jour localement');
            // Ajouter à la queue de sync pour tentative ultérieure
            databaseService.insert('sync_queue', {
              table_name: 'products',
              record_id: id,
              operation: 'update',
              data: JSON.stringify(productData),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          } else if (error instanceof Error && error.message.includes('Mode offline')) {
            console.log('📱 [REDUX DEBUG] Mode offline - produit mis à jour localement (normal)');
            // Ajouter à la queue de sync pour quand on repassera en ligne
            databaseService.insert('sync_queue', {
              table_name: 'products',
              record_id: id,
              operation: 'update',
              data: JSON.stringify(productData),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          } else {
            console.log('⚠️ [REDUX DEBUG] Sync Firebase échouée:', error.message);
            // Ajouter à la queue de sync pour tentative ultérieure
            databaseService.insert('sync_queue', {
              table_name: 'products',
              record_id: id,
              operation: 'update',
              data: JSON.stringify(productData),
              priority: 1,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
            });
          }
        });
      } else {
        // Mode offline - ajouter directement à la queue de sync
        console.log('📱 [REDUX DEBUG] Mode offline - ajout à la queue de synchronisation');
        databaseService.insert('sync_queue', {
          table_name: 'products',
          record_id: id,
          operation: 'update',
          data: JSON.stringify(productData),
          priority: 1,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
      }
      
      return updatedProduct;
    } catch (error) {
      console.error('❌ [REDUX DEBUG] Erreur updateProduct:', error);
      throw error;
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id: string, { dispatch, getState }) => {
    try {
      console.log('🗑️ [REDUX DEBUG] Début deleteProduct');
      console.log('🗑️ [REDUX DEBUG] ID:', id);

      // Utiliser la fonction utilitaire pour gérer la suppression offline/online
      const success = await handleOfflineDelete(id);
      
      if (!success) {
        throw new Error('Échec de la suppression du produit');
      }

      console.log('✅ [REDUX DEBUG] Produit supprimé avec succès:', id);
      return id;
    } catch (error) {
      console.error('❌ [REDUX DEBUG] Erreur deleteProduct:', error);
      throw error;
    }
  }
);

export const searchProducts = createAsyncThunk(
  'products/searchProducts',
  async (query: string, { dispatch }) => {
    try {
      const products = await databaseService.query<Product>(
        `SELECT * FROM products 
         WHERE name LIKE ? OR description LIKE ? OR sku LIKE ?
         ORDER BY name ASC`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );
      return products;
    } catch (error) {
      console.error('Erreur searchProducts:', error);
      throw error;
    }
  }
);

export const getProductsByCategory = createAsyncThunk(
  'products/getProductsByCategory',
  async (categoryId: string, { dispatch }) => {
    try {
      const products = await databaseService.query<Product>(
        'SELECT * FROM products WHERE category_id = ? ORDER BY name ASC',
        [categoryId]
      );
      return products;
    } catch (error) {
      console.error('Erreur getProductsByCategory:', error);
      throw error;
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offlineMode = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSortBy: (state, action: PayloadAction<'name' | 'price' | 'created_at'>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },
    markProductSynced: (state, action: PayloadAction<string>) => {
      const product = state.products.find(p => p.id === action.payload);
      if (product) {
        product.sync_status = 'synced';
        product.sync_timestamp = new Date().toISOString();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetProducts: (state) => {
      state.products = [];
      state.loading = false;
      state.error = null;
      state.lastSync = null;
      state.offlineMode = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProducts
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de chargement des produits';
      })
      
      // createProduct
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.push(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création du produit';
      })
      
      // updateProduct
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la mise à jour du produit';
      })
      
      // deleteProduct
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(p => p.id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la suppression du produit';
      })
      
      // searchProducts
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.products = action.payload;
      })
      
      // getProductsByCategory
      .addCase(getProductsByCategory.fulfilled, (state, action) => {
        state.products = action.payload;
      });
  },
});

export const {
  setLastSync,
  setOfflineMode,
  setSearchQuery,
  setSelectedCategory,
  setSortBy,
  setSortOrder,
  markProductSynced,
  clearError,
  resetProducts,
} = productSlice.actions;

export default productSlice.reducer;
