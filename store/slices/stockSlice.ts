import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { databaseService, Stock } from '../../services/DatabaseService';

interface StockState {
  stock: Stock[];
  loading: boolean;
  error: string | null;
  lowStockProducts: any[];
  lastSync: string | null;
}

const initialState: StockState = {
  stock: [],
  loading: false,
  error: null,
  lowStockProducts: [],
  lastSync: null,
};

// Thunks pour les opérations async
export const fetchStock = createAsyncThunk(
  'stock/fetchStock',
  async () => {
    try {
      const stock = await databaseService.query<Stock>('SELECT * FROM stock ORDER BY updated_at DESC');
      return stock;
    } catch (error) {
      console.error('Erreur fetchStock:', error);
      throw error;
    }
  }
);

export const fetchProductsWithStock = createAsyncThunk(
  'stock/fetchProductsWithStock',
  async () => {
    try {
      const products = await databaseService.getProductsWithStock();
      return products;
    } catch (error) {
      console.error('Erreur fetchProductsWithStock:', error);
      throw error;
    }
  }
);

export const fetchLowStockProducts = createAsyncThunk(
  'stock/fetchLowStockProducts',
  async () => {
    try {
      const products = await databaseService.getLowStockProducts();
      return products;
    } catch (error) {
      console.error('Erreur fetchLowStockProducts:', error);
      throw error;
    }
  }
);

export const updateStock = createAsyncThunk(
  'stock/updateStock',
  async ({ id, updates }: { id: string; updates: Partial<Stock> }, { dispatch }) => {
    try {
      // Mettre à jour localement
      await databaseService.update('stock', id, {
        ...updates,
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      });

      // Récupérer le stock mis à jour
      const updatedStock = await databaseService.query<Stock>(
        'SELECT * FROM stock WHERE id = ?',
        [id]
      );

      console.log('✅ Stock mis à jour localement:', id);
      return updatedStock[0];
    } catch (error) {
      console.error('Erreur updateStock:', error);
      throw error;
    }
  }
);

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
    
    markStockSynced: (state, action: PayloadAction<string>) => {
      const stockItem = state.stock.find(s => s.id === action.payload);
      if (stockItem) {
        stockItem.sync_status = 'synced';
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetStock: (state) => {
      state.stock = [];
      state.loading = false;
      state.error = null;
      state.lowStockProducts = [];
      state.lastSync = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchStock
      .addCase(fetchStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStock.fulfilled, (state, action) => {
        state.loading = false;
        state.stock = action.payload;
      })
      .addCase(fetchStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de chargement du stock';
      })
      
      // fetchProductsWithStock
      .addCase(fetchProductsWithStock.fulfilled, (state, action) => {
        // Cette action met à jour les données combinées produits + stock
        // On pourrait stocker ces données dans un état séparé si nécessaire
      })
      
      // fetchLowStockProducts
      .addCase(fetchLowStockProducts.fulfilled, (state, action) => {
        state.lowStockProducts = action.payload;
      })
      
      // updateStock
      .addCase(updateStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.stock.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.stock[index] = action.payload;
        } else {
          state.stock.push(action.payload);
        }
      })
      .addCase(updateStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la mise à jour du stock';
      });
  },
});

export const {
  setLastSync,
  markStockSynced,
  clearError,
  resetStock,
} = stockSlice.actions;

export default stockSlice.reducer;
