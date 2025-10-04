import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { databaseService, Sale, SaleItem } from '../../services/DatabaseService';

interface SalesState {
  sales: Sale[];
  saleItems: SaleItem[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
  dailyStats: {
    totalSales: number;
    totalAmount: number;
    salesCount: number;
  };
}

const initialState: SalesState = {
  sales: [],
  saleItems: [],
  loading: false,
  error: null,
  lastSync: null,
  dailyStats: {
    totalSales: 0,
    totalAmount: 0,
    salesCount: 0,
  },
};

// Thunks pour les opérations async
export const fetchSales = createAsyncThunk(
  'sales/fetchSales',
  async (_, { dispatch }) => {
    try {
      const sales = await databaseService.query<Sale>('SELECT * FROM sales ORDER BY sale_date DESC');
      return sales;
    } catch (error) {
      console.error('Erreur fetchSales:', error);
      throw error;
    }
  }
);

export const fetchSalesByDateRange = createAsyncThunk(
  'sales/fetchSalesByDateRange',
  async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    try {
      const sales = await databaseService.getSalesByDateRange(startDate, endDate);
      return sales;
    } catch (error) {
      console.error('Erreur fetchSalesByDateRange:', error);
      throw error;
    }
  }
);

export const fetchSaleItems = createAsyncThunk(
  'sales/fetchSaleItems',
  async (saleId?: string) => {
    try {
      let sql = 'SELECT * FROM sale_items';
      let params: any[] = [];
      
      if (saleId) {
        sql += ' WHERE sale_id = ?';
        params = [saleId];
      }
      
      sql += ' ORDER BY created_at DESC';
      
      const saleItems = await databaseService.query<SaleItem>(sql, params);
      return saleItems;
    } catch (error) {
      console.error('Erreur fetchSaleItems:', error);
      throw error;
    }
  }
);

export const createSale = createAsyncThunk(
  'sales/createSale',
  async (saleData: {
    sale: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'sync_status'>;
    items: Omit<SaleItem, 'id' | 'sale_id'>[];
  }, { dispatch }) => {
    try {
      // Créer la vente
      const saleId = await databaseService.insert('sales', {
        ...saleData.sale,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      });

      // Créer les lignes de vente
      for (const item of saleData.items) {
        await databaseService.insert('sale_items', {
          ...item,
          sale_id: saleId,
        });
      }

      // Récupérer la vente créée avec ses items
      const createdSale = await databaseService.getById<Sale>('sales', saleId);
      const createdItems = await databaseService.query<SaleItem>(
        'SELECT * FROM sale_items WHERE sale_id = ?',
        [saleId]
      );

      console.log('✅ Vente créée localement:', saleId);
      return { sale: createdSale!, items: createdItems };
    } catch (error) {
      console.error('Erreur createSale:', error);
      throw error;
    }
  }
);

export const updateSale = createAsyncThunk(
  'sales/updateSale',
  async ({ id, updates }: { id: string; updates: Partial<Sale> }, { dispatch }) => {
    try {
      // Mettre à jour la vente
      await databaseService.update('sales', id, {
        ...updates,
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      });

      // Récupérer la vente mise à jour
      const updatedSale = await databaseService.getById<Sale>('sales', id);

      console.log('✅ Vente mise à jour localement:', id);
      return updatedSale!;
    } catch (error) {
      console.error('Erreur updateSale:', error);
      throw error;
    }
  }
);

export const fetchDailyStats = createAsyncThunk(
  'sales/fetchDailyStats',
  async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sales = await databaseService.query<Sale>(
        'SELECT * FROM sales WHERE DATE(sale_date) = ?',
        [today]
      );

      const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const salesCount = sales.length;

      return {
        totalSales: sales.length,
        totalAmount,
        salesCount,
      };
    } catch (error) {
      console.error('Erreur fetchDailyStats:', error);
      throw error;
    }
  }
);

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
    
    markSaleSynced: (state, action: PayloadAction<string>) => {
      const sale = state.sales.find(s => s.id === action.payload);
      if (sale) {
        sale.sync_status = 'synced';
        sale.sync_timestamp = new Date().toISOString();
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetSales: (state) => {
      state.sales = [];
      state.saleItems = [];
      state.loading = false;
      state.error = null;
      state.lastSync = null;
      state.dailyStats = {
        totalSales: 0,
        totalAmount: 0,
        salesCount: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchSales
      .addCase(fetchSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.loading = false;
        state.sales = action.payload;
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de chargement des ventes';
      })
      
      // fetchSalesByDateRange
      .addCase(fetchSalesByDateRange.fulfilled, (state, action) => {
        state.sales = action.payload;
      })
      
      // fetchSaleItems
      .addCase(fetchSaleItems.fulfilled, (state, action) => {
        state.saleItems = action.payload;
      })
      
      // createSale
      .addCase(createSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.loading = false;
        state.sales.unshift(action.payload.sale);
        state.saleItems.push(...action.payload.items);
      })
      .addCase(createSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création de la vente';
      })
      
      // updateSale
      .addCase(updateSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSale.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sales.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sales[index] = action.payload;
        }
      })
      .addCase(updateSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la mise à jour de la vente';
      })
      
      // fetchDailyStats
      .addCase(fetchDailyStats.fulfilled, (state, action) => {
        state.dailyStats = action.payload;
      });
  },
});

export const {
  setLastSync,
  markSaleSynced,
  clearError,
  resetSales,
} = salesSlice.actions;

export default salesSlice.reducer;
