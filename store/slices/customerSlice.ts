import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Customer, databaseService } from '../../services/DatabaseService';

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
}

const initialState: CustomerState = {
  customers: [],
  loading: false,
  error: null,
  lastSync: null,
};

// Thunks pour les opérations async
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async () => {
    try {
      const customers = await databaseService.query<Customer>(
        'SELECT * FROM customers ORDER BY name ASC'
      );
      return customers;
    } catch (error) {
      console.error('Erreur fetchCustomers:', error);
      throw error;
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: Omit<Customer, 'id' | 'created_at' | 'sync_status'>, { dispatch }) => {
    try {
      const newCustomer: Omit<Customer, 'id'> = {
        ...customerData,
        created_at: new Date().toISOString(),
        sync_status: 'pending',
      };

      const id = await databaseService.insert('customers', newCustomer);
      const createdCustomer = { ...newCustomer, id };

      console.log('✅ Client créé localement:', id);
      return createdCustomer;
    } catch (error) {
      console.error('Erreur createCustomer:', error);
      throw error;
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, updates }: { id: string; updates: Partial<Customer> }, { dispatch }) => {
    try {
      await databaseService.update('customers', id, {
        ...updates,
        sync_status: 'pending',
      });

      const updatedCustomer = await databaseService.getById<Customer>('customers', id);

      console.log('✅ Client mis à jour localement:', id);
      return updatedCustomer!;
    } catch (error) {
      console.error('Erreur updateCustomer:', error);
      throw error;
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { dispatch }) => {
    try {
      await databaseService.delete('customers', id);
      console.log('✅ Client supprimé localement:', id);
      return id;
    } catch (error) {
      console.error('Erreur deleteCustomer:', error);
      throw error;
    }
  }
);

export const searchCustomers = createAsyncThunk(
  'customers/searchCustomers',
  async (query: string) => {
    try {
      const customers = await databaseService.query<Customer>(
        `SELECT * FROM customers 
         WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
         ORDER BY name ASC`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );
      return customers;
    } catch (error) {
      console.error('Erreur searchCustomers:', error);
      throw error;
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
    
    markCustomerSynced: (state, action: PayloadAction<string>) => {
      const customer = state.customers.find(c => c.id === action.payload);
      if (customer) {
        customer.sync_status = 'synced';
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetCustomers: (state) => {
      state.customers = [];
      state.loading = false;
      state.error = null;
      state.lastSync = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCustomers
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur de chargement des clients';
      })
      
      // createCustomer
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers.push(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création du client';
      })
      
      // updateCustomer
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customers.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la mise à jour du client';
      })
      
      // deleteCustomer
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = state.customers.filter(c => c.id !== action.payload);
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la suppression du client';
      })
      
      // searchCustomers
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.customers = action.payload;
      });
  },
});

export const {
  setLastSync,
  markCustomerSynced,
  clearError,
  resetCustomers,
} = customerSlice.actions;

export default customerSlice.reducer;
