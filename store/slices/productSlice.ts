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
      // Récupérer l'utilisateur connecté
      const { getCurrentUser } = await import('../../utils/userInfo');
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [FETCH PRODUCTS] Aucun utilisateur connecté, retour tableau vide');
        return [];
      }
      
      console.log('👤 [FETCH PRODUCTS] Chargement produits pour:', currentUser.email);
      const allowedOwners = currentUser.allowedOwnerIds || [currentUser.uid];
      const ownerSet = new Set(allowedOwners);
      
      // Charger SEULEMENT les produits de cet utilisateur
      const allProducts = await databaseService.getProductsWithStock();
      const userProducts = allProducts.filter(p => !p.created_by || ownerSet.has(p.created_by));
      
      console.log(`📦 [FETCH PRODUCTS] ${userProducts.length}/${allProducts.length} produits pour ${currentUser.email}`);
      
      // Définir le mode offline seulement si pas de connexion
      if (!state.network.isConnected) {
        dispatch(setOfflineMode(true));
      } else {
        dispatch(setOfflineMode(false));
      }
      
      // Synchronisation Firebase désactivée pour éviter les boucles infinies
      // Utiliser le bouton de téléchargement manuel dans l'interface
      
      return userProducts;
      
    } catch (error) {
      console.error('Erreur fetchProducts:', error);
      throw error;
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sync_status'> & { stock_quantity?: number }, { dispatch, getState }) => {
    console.log('🚀 [PRODUCT] Début createProduct');
    console.log('🚀 [PRODUCT] ProductData reçu:', productData);
    
    try {
      const state = getState() as { network: { isConnected: boolean } };
      const isOnline = state.network.isConnected;
      console.log('🌐 [PRODUCT] État réseau:', isOnline ? 'EN LIGNE ✅' : 'HORS LIGNE ❌');
      
      // Récupérer les informations de l'utilisateur connecté
      const { generateCreatedByFields } = await import('../../utils/userInfo');
      const createdByFields = await generateCreatedByFields();
      
      const newProduct: Omit<Product, 'id'> = {
        ...productData,
        ...createdByFields,
        created_at: new Date().toISOString() as any,
        updated_at: new Date().toISOString() as any,
        sync_status: 'pending',
      };

      // ✅ BONNE PRATIQUE : MODE EN LIGNE → CRÉER DIRECTEMENT DANS FIREBASE
      if (isOnline) {
        console.log('🌐 [PRODUCT] MODE EN LIGNE : Création directe dans Firebase');
        
        try {
          // Créer le produit dans Firebase
          const firebaseProductId = await firebaseService.createProduct({ ...newProduct, sync_status: 'synced' as const });
          console.log('✅ [PRODUCT] Produit créé dans Firebase:', firebaseProductId);

          // Créer le stock si nécessaire
          let firebaseStockId: string | undefined;
          if (productData.stock_quantity !== undefined) {
            console.log('📦 [PRODUCT] Création stock dans Firebase:', productData.stock_quantity);
            
            firebaseStockId = await firebaseService.createStock({
              product_id: firebaseProductId, // Utiliser l'ID Firebase du produit
              location_id: 'default',
              quantity_current: productData.stock_quantity,
              quantity_min: 0,
              quantity_max: 1000,
              last_movement_date: new Date().toISOString(),
              last_movement_type: 'initial',
              sync_status: 'synced' as const,
              ...createdByFields,
            });
            console.log('✅ [PRODUCT] Stock créé dans Firebase:', firebaseStockId);
          }

          // Le listener temps réel mettra automatiquement à jour AsyncStorage
          // Retourner directement avec les IDs Firebase
          return {
            ...newProduct,
            id: firebaseProductId,
            sync_status: 'synced' as const,
          };
        } catch (error: any) {
          // Silencieux en dev/offline: pas de console.error pour éviter LogBox
          // Fallback vers le mode offline ci-dessous
        }
      }

      // ❌ MODE HORS LIGNE : CRÉER EN LOCAL ET AJOUTER À LA QUEUE
      
      const id = await databaseService.insert('products', newProduct);
      
      // Créer l'entrée de stock si nécessaire
      if (productData.stock_quantity !== undefined) {
        
        const stockData = {
          product_id: id,
          location_id: 'default',
          quantity_current: productData.stock_quantity,
          quantity_min: 0,
          quantity_max: 1000,
          last_movement_date: new Date().toISOString(),
          last_movement_type: 'initial',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'pending' as const,
          ...createdByFields,
        };
        
        const stockId = await databaseService.insert('stock', stockData);
        
        // Ajouter à la queue de synchronisation
        await databaseService.insert('sync_queue', {
          table_name: 'stock',
          record_id: stockId,
          operation: 'create',
          data: JSON.stringify(stockData),
          priority: 1,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
      }
      
      // Ajouter le produit à la queue de synchronisation
      await databaseService.insert('sync_queue', {
        table_name: 'products',
        record_id: id,
        operation: 'create',
        data: JSON.stringify(newProduct),
        priority: 1,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
      
      return { ...newProduct, id };
    } catch (error: any) {
      console.error('❌ [REDUX DEBUG] Erreur createProduct:', error);
      console.error('❌ [REDUX DEBUG] Stack trace:', error?.stack);
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
          // Mettre à jour le statut de sync (le firebase_id existe déjà)
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

      const state = getState() as { network: { isConnected: boolean } };
      const isOnline = state.network.isConnected;

      // Heuristique: si l'ID ne commence pas par "id-", il s'agit très probablement d'un ID Firestore
      const looksLikeFirebaseId = !id.startsWith('id-');

      if (isOnline || looksLikeFirebaseId) {
        try {
          await firebaseService.deleteProduct(id);
          console.log('✅ [REDUX DEBUG] Produit supprimé dans Firebase (priorité ID):', id);
          await databaseService.delete('products', id);
          return id;
        } catch (e) {
          console.log('⚠️ [REDUX DEBUG] Suppression Firebase directe échouée, tentative via signature');
          const products = await databaseService.getAll('products');
          const p = products.find((p: any) => p.id === id) as any;
          if (p) {
            const guessedId = await firebaseService.findProductIdBySignature({
              createdBy: p.created_by,
              sku: p.sku,
              name: p.name,
              createdAtIso: p.created_at,
            });
            if (guessedId) {
              await firebaseService.deleteProduct(guessedId);
              console.log('✅ [REDUX DEBUG] Produit supprimé via signature (ID Firebase):', guessedId);
              await databaseService.delete('products', id);
              return id;
            }
          }
          console.log('⚠️ [REDUX DEBUG] Aucune résolution d\'ID possible, fallback offline');
        }
      }

      const success = await handleOfflineDelete(id);
      if (!success) {
        throw new Error('Échec de la suppression du produit');
      }
      console.log('✅ [REDUX DEBUG] Produit supprimé (fallback/offline):', id);
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

export const updateProductStock = createAsyncThunk(
  'products/updateProductStock',
  async ({ productId, newStock }: { productId: string; newStock: number }, { dispatch }) => {
    try {
      console.log('📦 [REDUX DEBUG] Mise à jour stock produit:', productId, 'nouveau stock:', newStock);
      
      // Mettre à jour le stock dans la base de données locale
      const stockItems = await databaseService.query('SELECT * FROM stock WHERE product_id = ?', [productId]);
      if (stockItems.length > 0) {
        const stockItem = stockItems[0] as any;
        await databaseService.update('stock', stockItem.id, {
          quantity_current: newStock,
          last_movement_date: new Date().toISOString(),
          last_movement_type: 'out',
        });
      }
      
      // Retourner les données pour mettre à jour le store
      return { productId, newStock };
    } catch (error) {
      console.error('Erreur updateProductStock:', error);
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
    forceStopLoading: (state) => {
      state.loading = false;
    },
    updateStockLocally: (state, action: PayloadAction<{ productId: string; newStock: number }>) => {
      const { productId, newStock } = action.payload;
      const product = state.products.find(p => p.id === productId);
      if (product) {
        // Mettre à jour le stock dans l'objet produit
        (product as any).quantity_current = newStock;
        console.log('📦 [REDUX] Stock mis à jour localement pour', product.name, ':', newStock);
      }
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
        
        // Déclencher une synchronisation automatique du stock après création d'un produit
        // Cela permet de mettre à jour la page Stock automatiquement
        setTimeout(() => {
          console.log('🔄 [AUTO SYNC] Déclenchement synchronisation automatique après création produit');
          // Import dynamique pour éviter les dépendances circulaires
          import('../../services/SyncService').then(({ syncService }) => {
            syncService.startSync();
          });
        }, 2000); // Attendre 2 secondes pour que Firebase soit synchronisé
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
        if (action.payload && typeof action.payload === 'object' && 'id' in action.payload) {
          const updatedProduct = action.payload as Product;
          const index = state.products.findIndex(p => p.id === updatedProduct.id);
          if (index !== -1) {
            state.products[index] = updatedProduct;
          }
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
      })
      
      // updateProductStock
      .addCase(updateProductStock.fulfilled, (state, action) => {
        const { productId, newStock } = action.payload;
        const product = state.products.find(p => p.id === productId);
        if (product) {
          (product as any).quantity_current = newStock;
          console.log('📦 [REDUX] Stock mis à jour dans le store pour', product.name, ':', newStock);
        }
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
  forceStopLoading,
  updateStockLocally,
} = productSlice.actions;

export default productSlice.reducer;
