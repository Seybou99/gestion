import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    databaseService,
    StockAdjustment,
    StockEntry,
    StockEntryItem,
    StockMovement
} from '../../services/DatabaseService';
import { syncService } from '../../services/SyncService';
import { generateAdjustmentNumber, generateEntryNumber, generateMovementNumber } from '../../utils/numberGenerator';

interface StockMovementState {
  entries: StockEntry[];
  adjustments: StockAdjustment[];
  movements: StockMovement[];
  loading: boolean;
  error: string | null;
}

const initialState: StockMovementState = {
  entries: [],
  adjustments: [],
  movements: [],
  loading: false,
  error: null,
};

// ===== ENTRÉES DE STOCK (ARRIVAGES) =====

/**
 * Récupérer toutes les entrées de stock
 */
export const fetchStockEntries = createAsyncThunk(
  'stockMovement/fetchEntries',
  async () => {
    const entries = await databaseService.getAll<StockEntry>('stock_entries');
    return entries;
  }
);

/**
 * Créer une entrée de stock
 */
export const createStockEntry = createAsyncThunk(
  'stockMovement/createEntry',
  async (entryData: Omit<StockEntry, 'id' | 'entry_number' | 'created_at' | 'updated_at' | 'sync_status'>, { getState }) => {
    const state = getState() as any;
    const isConnected = state.network?.isConnected || false;
    
    // Générer le numéro d'entrée
    const entries = await databaseService.getAll<StockEntry>('stock_entries');
    const lastNumber = entries.length > 0 ? entries[entries.length - 1].entry_number : undefined;
    const entry_number = generateEntryNumber(lastNumber);
    
    // Importer les fonctions de génération des champs created_by
    const { generateCreatedByFields } = await import('../../utils/userInfo');
    const createdByFields = await generateCreatedByFields();
    
    const newEntry: Omit<StockEntry, 'id'> = {
      ...entryData,
      entry_number,
      ...createdByFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    };
    
    // Créer l'entrée localement
    const entryId = await databaseService.insert<StockEntry>('stock_entries', newEntry);
    
    // Créer les items d'entrée
    for (const item of entryData.items) {
      const entryItem: Omit<StockEntryItem, 'id'> = {
        ...item,
        entry_id: entryId,
      };
      await databaseService.insert<StockEntryItem>('stock_entry_items', entryItem);
    }
    
    // Mettre à jour les stocks et créer les mouvements
    for (const item of entryData.items) {
      await updateStockQuantity(
        item.product_id,
        entryData.location_id,
        item.quantity,
        'entry',
        entryId,
        createdByFields.created_by,
        createdByFields.created_by_name
      );
    }
    
    // Synchroniser si connecté
    if (isConnected) {
      try {
        await syncService.addToSyncQueue('stock_entries', entryId, 'create', newEntry);
      } catch (error) {
        console.error('Erreur sync entrée:', error);
      }
    } else {
      await syncService.addToSyncQueue('stock_entries', entryId, 'create', newEntry);
    }
    
    return { ...newEntry, id: entryId };
  }
);

// ===== AJUSTEMENTS DE STOCK (SORTIES) =====

/**
 * Récupérer tous les ajustements de stock
 */
export const fetchStockAdjustments = createAsyncThunk(
  'stockMovement/fetchAdjustments',
  async () => {
    const adjustments = await databaseService.getAll<StockAdjustment>('stock_adjustments');
    return adjustments;
  }
);

/**
 * Créer un ajustement de stock
 */
export const createStockAdjustment = createAsyncThunk(
  'stockMovement/createAdjustment',
  async (adjustmentData: Omit<StockAdjustment, 'id' | 'adjustment_number' | 'created_at' | 'updated_at' | 'sync_status'>, { getState }) => {
    const state = getState() as any;
    const isConnected = state.network?.isConnected || false;
    
    // Générer le numéro d'ajustement
    const adjustments = await databaseService.getAll<StockAdjustment>('stock_adjustments');
    const lastNumber = adjustments.length > 0 ? adjustments[adjustments.length - 1].adjustment_number : undefined;
    const adjustment_number = generateAdjustmentNumber(lastNumber);
    
    // Importer les fonctions de génération des champs created_by
    const { generateCreatedByFields } = await import('../../utils/userInfo');
    const createdByFields = await generateCreatedByFields();
    
    const newAdjustment: Omit<StockAdjustment, 'id'> = {
      ...adjustmentData,
      adjustment_number,
      ...createdByFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    };
    
    // Créer l'ajustement localement
    const adjustmentId = await databaseService.insert<StockAdjustment>('stock_adjustments', newAdjustment);
    
    // Mettre à jour le stock et créer le mouvement
    // La quantité est négative pour les sorties (sauf pour les corrections positives)
    const quantityChange = adjustmentData.quantity;
    await updateStockQuantity(
      adjustmentData.product_id,
      adjustmentData.location_id,
      quantityChange,
      'adjustment',
      adjustmentId,
      createdByFields.created_by,
      createdByFields.created_by_name
    );
    
    // Synchroniser si connecté
    if (isConnected) {
      try {
        await syncService.addToSyncQueue('stock_adjustments', adjustmentId, 'create', newAdjustment);
      } catch (error) {
        console.error('Erreur sync ajustement:', error);
      }
    } else {
      await syncService.addToSyncQueue('stock_adjustments', adjustmentId, 'create', newAdjustment);
    }
    
    return { ...newAdjustment, id: adjustmentId };
  }
);

// ===== MOUVEMENTS DE STOCK (HISTORIQUE) =====

/**
 * Récupérer tous les mouvements de stock
 */
export const fetchStockMovements = createAsyncThunk(
  'stockMovement/fetchMovements',
  async () => {
    const movements = await databaseService.getAll<StockMovement>('stock_movements');
    return movements.sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime());
  }
);

// ===== FONCTION UTILITAIRE =====

/**
 * Met à jour la quantité en stock et crée un mouvement
 */
async function updateStockQuantity(
  productId: string,
  locationId: string,
  quantityChange: number,
  movementType: 'entry' | 'adjustment' | 'sale' | 'transfer',
  referenceId: string,
  createdBy: string,
  createdByName: string
): Promise<void> {
  // Récupérer le stock actuel
  const inventoryItems = await databaseService.getAll<any>('inventory');
  const stockItem = inventoryItems.find(
    (item: any) => item.product_id === productId && item.location_id === locationId
  );
  
  const quantityBefore = stockItem ? stockItem.quantity_available : 0;
  const quantityAfter = quantityBefore + quantityChange;
  
  // Mettre à jour ou créer le stock
  if (stockItem) {
    await databaseService.update('inventory', stockItem.id, {
      quantity_available: quantityAfter,
      last_movement_date: new Date().toISOString(),
      last_movement_type: movementType,
      updated_at: new Date().toISOString(),
    });
  } else {
    // Créer un nouveau stock si n'existe pas
    await databaseService.insert('inventory', {
      product_id: productId,
      location_id: locationId,
      quantity_available: quantityAfter,
      quantity_reserved: 0,
      quantity_min: 0,
      quantity_max: 1000,
      last_movement_date: new Date().toISOString(),
      last_movement_type: movementType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    });
  }
  
  // Créer le mouvement
  const movements = await databaseService.getAll<StockMovement>('stock_movements');
  const lastNumber = movements.length > 0 ? movements[movements.length - 1].movement_number : undefined;
  const movement_number = generateMovementNumber(lastNumber);
  
  // Récupérer le nom du produit
  const products = await databaseService.getAll<any>('products');
  const product = products.find((p: any) => p.id === productId);
  
  const movement: Omit<StockMovement, 'id'> = {
    movement_number,
    movement_date: new Date().toISOString(),
    movement_type: movementType,
    location_id: locationId,
    product_id: productId,
    product_name: product?.name || 'Produit inconnu',
    quantity: quantityChange,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reference_id: referenceId,
    reference_type: movementType,
    created_by: createdBy,
    created_by_name: createdByName,
    created_at: new Date().toISOString(),
    sync_status: 'pending',
  };
  
  await databaseService.insert<StockMovement>('stock_movements', movement);
}

// ===== SLICE =====

const stockMovementSlice = createSlice({
  name: 'stockMovement',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Entrées de stock
    builder
      .addCase(fetchStockEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchStockEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors du chargement des entrées';
      })
      .addCase(createStockEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStockEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.entries.push(action.payload);
      })
      .addCase(createStockEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création de l\'entrée';
      });
    
    // Ajustements de stock
    builder
      .addCase(fetchStockAdjustments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockAdjustments.fulfilled, (state, action) => {
        state.loading = false;
        state.adjustments = action.payload;
      })
      .addCase(fetchStockAdjustments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors du chargement des ajustements';
      })
      .addCase(createStockAdjustment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStockAdjustment.fulfilled, (state, action) => {
        state.loading = false;
        state.adjustments.push(action.payload);
      })
      .addCase(createStockAdjustment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création de l\'ajustement';
      });
    
    // Mouvements de stock
    builder
      .addCase(fetchStockMovements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockMovements.fulfilled, (state, action) => {
        state.loading = false;
        state.movements = action.payload;
      })
      .addCase(fetchStockMovements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors du chargement des mouvements';
      });
  },
});

export const { clearError } = stockMovementSlice.actions;
export default stockMovementSlice.reducer;

