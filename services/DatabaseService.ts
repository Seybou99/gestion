// Version simplifiée utilisant AsyncStorage pour les tests
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/idGenerator';

// Types pour les entités principales
export interface Product {
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
  images?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  sync_timestamp?: string;
  created_by?: string;  // ID de l'utilisateur qui a créé le produit
  created_by_name?: string;  // Nom de l'utilisateur qui a créé le produit
}

export interface Stock {
  id: string;
  product_id: string;
  location_id: string;
  quantity_current: number;
  quantity_min: number;
  quantity_max: number;
  last_movement_date?: string;
  last_movement_type?: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  created_by?: string;  // ID de l'utilisateur qui a créé le stock
  created_by_name?: string;  // Nom de l'utilisateur qui a créé le stock
}

export interface Sale {
  id: string;
  user_id: string;        // ID de l'utilisateur qui effectue la vente
  customer_id?: string;
  location_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status: 'paid' | 'pending' | 'refunded';
  sale_date: string;
  created_by: string;     // ID de l'utilisateur
  created_by_name: string;     // Nom de l'utilisateur
  notes?: string;
  sync_status: 'synced' | 'pending' | 'error';
  sync_timestamp?: string;
  created_at: string;
  updated_at: string;
}

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
  created_by?: string;  // ID de l'utilisateur qui a créé la catégorie
  created_by_name?: string;  // Nom de l'utilisateur qui a créé la catégorie
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Refund {
  id: string;
  sale_id: string;          // ID de la vente remboursée
  user_id: string;           // ID de l'utilisateur qui effectue le remboursement
  customer_id?: string;
  location_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  refund_date: string;
  created_by: string;        // ID de l'utilisateur
  created_by_name: string;   // Nom de l'utilisateur
  notes?: string;
  sync_status: 'synced' | 'pending' | 'error';
  sync_timestamp?: string;
  created_at: string;
  updated_at: string;
}

export interface RefundItem {
  id: string;
  refund_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: 'retail' | 'wholesale';
  credit_limit: number;
  credit_balance: number;
  created_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  created_by?: string;  // ID de l'utilisateur qui a créé le client
  created_by_name?: string;  // Nom de l'utilisateur qui a créé le client
}

export interface Location {
  id: string;
  name: string;                    // Nom de l'emplacement
  address: string;                 // Adresse complète
  location_type: 'warehouse' | 'store' | 'supplier';  // Type d'emplacement
  contact_person?: string;         // Personne de contact
  phone?: string;                  // Téléphone
  is_active: boolean;              // Actif ou non
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string;
  created_by?: string;  // ID de l'utilisateur qui a créé l'emplacement
  created_by_name?: string;  // Nom de l'utilisateur qui a créé l'emplacement
}

export interface Inventory {
  id: string;
  product_id: string;              // Référence au produit
  location_id: string;             // Référence à l'emplacement (entrepôt/magasin)
  quantity_available: number;      // Quantité disponible
  quantity_reserved: number;       // Quantité réservée
  quantity_min: number;            // Seuil minimum (alerte)
  quantity_max: number;            // Capacité maximum
  last_movement_date?: string;     // Dernier mouvement
  last_movement_type?: string;     // Type : initial, sale, transfer, purchase
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string;
  created_by?: string;  // ID de l'utilisateur qui a créé l'inventaire
  created_by_name?: string;  // Nom de l'utilisateur qui a créé l'inventaire
}

export interface Transfer {
  id: string;
  from_location_id: string;        // Emplacement source
  to_location_id: string;          // Emplacement destination
  product_id: string;              // Produit transféré
  quantity: number;                // Quantité transférée
  transfer_date: string;           // Date du transfert
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;                  // Notes optionnelles
  created_by: string;              // ID de l'utilisateur ayant créé le transfert
  created_by_name: string;         // Nom de l'utilisateur ayant créé le transfert
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string;
}

// ===== NOUVEAUX TYPES POUR LES MOUVEMENTS DE STOCK =====

export interface StockEntry {
  id: string;
  entry_number: string;            // Numéro d'arrivage (auto-généré)
  entry_date: string;              // Date de réception
  location_id: string;             // Entrepôt de destination
  supplier_id?: string;            // Fournisseur (optionnel)
  supplier_name?: string;          // Nom du fournisseur
  delivery_note?: string;          // Numéro de bon de livraison
  items: StockEntryItem[];         // Articles reçus
  total_cost: number;              // Coût total
  notes?: string;                  // Notes
  status: 'draft' | 'completed';   // Statut
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string;
}

export interface StockEntryItem {
  id: string;
  entry_id: string;                // Référence à l'entrée
  product_id: string;              // Produit
  product_name?: string;           // Nom du produit (pour affichage)
  quantity: number;                // Quantité reçue
  unit_cost: number;               // Prix d'achat unitaire
  total_cost: number;              // Coût total (quantity * unit_cost)
}

export interface StockAdjustment {
  id: string;
  adjustment_number: string;       // Numéro d'ajustement (auto-généré)
  adjustment_date: string;         // Date de l'ajustement
  adjustment_type: 'loss' | 'damage' | 'theft' | 'donation' | 'sample' | 'return' | 'correction' | 'other';
  location_id: string;             // Entrepôt concerné
  product_id: string;              // Produit
  product_name?: string;           // Nom du produit (pour affichage)
  quantity: number;                // Quantité (positive ou négative)
  reason: string;                  // Motif de l'ajustement
  notes?: string;                  // Notes supplémentaires
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string;
}

export interface StockMovement {
  id: string;
  movement_number: string;         // Numéro de mouvement
  movement_date: string;           // Date du mouvement
  movement_type: 'entry' | 'adjustment' | 'sale' | 'transfer';
  location_id: string;             // Entrepôt
  product_id: string;              // Produit
  product_name?: string;           // Nom du produit
  quantity: number;                // Quantité (+ pour entrée, - pour sortie)
  quantity_before: number;         // Stock avant
  quantity_after: number;          // Stock après
  reference_id?: string;           // ID de référence (entry_id, adjustment_id, sale_id, transfer_id)
  reference_type?: string;         // Type de référence
  notes?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  firebase_id?: string;
}

export interface SyncOperation {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  data: string;
  priority: number;
  retry_count: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  created_at: string;
  error_message?: string;
}

// Interface pour le service de base de données
export interface DatabaseService {
  init(): Promise<void>;
  createTables(): Promise<void>;
  insert<T>(table: string, data: Omit<T, 'id'>): Promise<string>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<void>;
  delete(table: string, id: string): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  getById<T>(table: string, id: string): Promise<T | null>;
  getAll<T>(table: string): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  
  // Méthode pour forcer l'invalidation du cache
  invalidateCache(table?: string): void;
}

// Implémentation simplifiée avec AsyncStorage
class DatabaseServiceImpl implements DatabaseService {
  private isInitialized = false;
  private cache: Map<string, { data: any[], timestamp: number }> = new Map();
  private CACHE_DURATION = 5000; // 5 secondes

  async init(): Promise<void> {
    try {
      console.log('🗄️ Base de données AsyncStorage initialisée');
      await this.createTables();
      console.log('📋 Tables créées avec succès');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erreur initialisation base de données:', error);
      throw error;
    }
  }

  async createTables(): Promise<void> {
    // Créer les clés de stockage si elles n'existent pas
    const tables = [
      'products', 
      'categories', 
      'stock', 
      'sales', 
      'sale_items', 
      'customers', 
      'sync_queue', 
      'sync_metadata',
      'stock_entries',      // Nouvelle table pour les entrées de stock
      'stock_entry_items',  // Nouvelle table pour les items d'entrée
      'stock_adjustments',  // Nouvelle table pour les ajustements
      'stock_movements',    // Nouvelle table pour l'historique des mouvements
      'warehouse',          // Table pour les entrepôts
      'locations',          // Table pour les emplacements
      'inventory',          // Table pour l'inventaire
      'quotes',             // Table pour les devis
      'quote_items',        // Table pour les articles de devis
      'refunds',            // Table pour les remboursements
      'refund_items'        // Table pour les articles de remboursement
    ];
    
    for (const table of tables) {
      const existing = await AsyncStorage.getItem(table);
      if (!existing) {
        await AsyncStorage.setItem(table, JSON.stringify([]));
      }
    }
    
    console.log('✅ Toutes les tables AsyncStorage ont été créées');
  }

  async insert<T>(table: string, data: Omit<T, 'id'>): Promise<string> {
    const id = generateId();
    const item = { id, ...data };
    
    try {
      const existing = await AsyncStorage.getItem(table);
      const items = existing ? JSON.parse(existing) : [];
      items.push(item);
      await AsyncStorage.setItem(table, JSON.stringify(items));
      
      // Invalider le cache pour cette table
      this.cache.delete(table);
      
      console.log(`✅ Insertion réussie dans ${table}: ${id}`);
      return id;
    } catch (error) {
      console.error(`❌ Erreur insertion dans ${table}:`, error);
      throw error;
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(table);
      const items = existing ? JSON.parse(existing) : [];
      
      const index = items.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        items[index] = { 
          ...items[index], 
          ...data, 
          updated_at: new Date().toISOString() 
        };
        await AsyncStorage.setItem(table, JSON.stringify(items));
        
        // Invalider le cache pour cette table
        this.cache.delete(table);
        
        console.log(`✅ Mise à jour réussie dans ${table}: ${id}`);
      } else {
        console.log(`⚠️ Item avec l'id ${id} non trouvé dans ${table} - ignoré`);
        return; // Retourner silencieusement au lieu de lancer une erreur
      }
    } catch (error) {
      console.log(`❌ Erreur mise à jour dans ${table}:`, error);
      throw error;
    }
  }

  async delete(table: string, id: string): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(table);
      const items = existing ? JSON.parse(existing) : [];
      
      const filteredItems = items.filter((item: any) => item.id !== id);
      await AsyncStorage.setItem(table, JSON.stringify(filteredItems));
      
      // Invalider le cache pour cette table
      this.cache.delete(table);
      
      console.log(`✅ Suppression réussie dans ${table}: ${id}`);
    } catch (error) {
      console.error(`❌ Erreur suppression dans ${table}:`, error);
      throw error;
    }
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      // Pour AsyncStorage, on ignore la requête SQL et on retourne tous les éléments
      const tableName = this.extractTableNameFromSQL(sql);
      const existing = await AsyncStorage.getItem(tableName);
      const items = existing ? JSON.parse(existing) : [];
      
      // Filtrage basique basé sur les paramètres
      if (params && params.length > 0) {
        return items.filter((item: any) => 
          params.some(param => 
            Object.values(item).some(value => 
              String(value).toLowerCase().includes(String(param).toLowerCase())
            )
          )
        );
      }
      
      return items;
    } catch (error) {
      console.error('❌ Erreur requête:', error);
      throw error;
    }
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    try {
      const existing = await AsyncStorage.getItem(table);
      const items = existing ? JSON.parse(existing) : [];
      
      const item = items.find((item: any) => item.id === id);
      return item || null;
    } catch (error) {
      console.error(`❌ Erreur getById ${table}:`, error);
      throw error;
    }
  }

  async getAll<T>(table: string): Promise<T[]> {
    try {
      // Vérifier le cache d'abord
      const cached = this.cache.get(table);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log(`⚡ Cache hit pour ${table}`);
        return cached.data;
      }

      const existing = await AsyncStorage.getItem(table);
      const items = existing ? JSON.parse(existing) : [];
      
      // Mettre en cache
      this.cache.set(table, { data: items, timestamp: Date.now() });
      
      // OPTIMISATION : Pas de tri par défaut pour aller plus vite
      // Le tri peut être fait côté UI si nécessaire
      return items;
    } catch (error) {
      console.error(`❌ Erreur getAll ${table}:`, error);
      throw error;
    }
  }

  /**
   * Récupère tous les éléments d'une table filtrés par utilisateur
   */
  async getAllByUser<T extends { created_by?: string; user_id?: string }>(
    table: string,
    userIds: string | string[],
  ): Promise<T[]> {
    try {
      const normalizedUserIds = Array.isArray(userIds)
        ? userIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
        : [userIds].filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

      if (normalizedUserIds.length === 0) {
        console.warn(`⚠️ getAllByUser appelé sans identifiant utilisateur valide pour ${table}`);
        return [];
      }

      const allItems = await this.getAll<T>(table);
      
      // Filtrer par utilisateur (created_by OU user_id)
      const userItems = allItems.filter(item => {
        const ownerId = item.created_by || item.user_id;
        return ownerId ? normalizedUserIds.includes(ownerId) : false;
      });
      
      console.log(`📊 ${userItems.length}/${allItems.length} éléments trouvés pour les utilisateurs [${normalizedUserIds.join(', ')}] dans ${table}`);
      
      return userItems;
    } catch (error) {
      console.error(`❌ Erreur getAllByUser dans ${table}:`, error);
      throw error;
    }
  }

  // Méthode séparée pour getAll avec tri (si nécessaire)
  async getAllSorted<T>(table: string): Promise<T[]> {
    try {
      const existing = await AsyncStorage.getItem(table);
      const items = existing ? JSON.parse(existing) : [];
      
      // Trier par date de création (plus récent en premier)
      return items.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error(`❌ Erreur getAllSorted ${table}:`, error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    // Pour AsyncStorage, cette méthode ne fait rien de spécial
    console.log('Execute SQL:', sql, params);
  }

  // Méthode utilitaire pour extraire le nom de table depuis une requête SQL
  private extractTableNameFromSQL(sql: string): string {
    const match = sql.match(/FROM\s+(\w+)/i) || sql.match(/INTO\s+(\w+)/i) || sql.match(/UPDATE\s+(\w+)/i);
    return match ? match[1] : 'products'; // Par défaut
  }

  // Méthodes spécifiques pour les opérations métier
  async getProductsWithStock(): Promise<any[]> {
    const products = await this.getAll<Product>('products');
    const stock = await this.getAll<Stock>('stock');
    
    return products.map((product) => {
      const stockItem = stock.find((s) => s.product_id === product.id);
      return {
        ...product,
        quantity_current: stockItem?.quantity_current || 0,
        quantity_min: stockItem?.quantity_min || 0,
        quantity_max: stockItem?.quantity_max || 0,
        last_movement_date: stockItem?.last_movement_date,
        last_movement_type: stockItem?.last_movement_type,
      };
    });
  }

  async getLowStockProducts(): Promise<any[]> {
    const productsWithStock = await this.getProductsWithStock();
    return productsWithStock.filter(product => {
      const currentQty = product.quantity_current || 0;
      
      // Si quantity_min est défini et > 0, utiliser cette valeur
      if (product.quantity_min && product.quantity_min > 0) {
        return currentQty <= product.quantity_min;
      }
      
      // Sinon, utiliser une logique par défaut : stock faible si < 20 unités
      // ou si le stock est inférieur à 10% du stock maximum (si défini)
      if (product.quantity_max && product.quantity_max > 0) {
        const threshold = Math.max(20, product.quantity_max * 0.1);
        return currentQty < threshold;
      }
      
      // Par défaut : considérer comme stock faible si < 20 unités et > 0
      return currentQty > 0 && currentQty < 20;
    });
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const sales = await this.getAll<Sale>('sales');
    const customers = await this.getAll<Customer>('customers');
    
    return sales
      .filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return saleDate >= start && saleDate <= end;
      })
      .map((sale) => {
        const customer = customers.find((c) => c.id === sale.customer_id);
        return {
          ...sale,
          customer_name: customer?.name,
          item_count: 0, // Pas implémenté pour l'instant
        };
      });
  }

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    const operations = await this.getAll<SyncOperation>('sync_queue');
    return operations.filter((op) => op.status === 'pending');
  }

  async getLastSyncTimestamp(): Promise<string> {
    const metadata = await this.getAll<any>('sync_metadata');
    return metadata[0]?.last_sync || '2024-01-01T00:00:00.000Z';
  }

  async updateLastSyncTimestamp(): Promise<void> {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem('sync_metadata', JSON.stringify([{
      id: 'last_sync',
      last_sync: timestamp,
    }]));
  }
  
  // Méthode pour forcer l'invalidation du cache
  invalidateCache(table?: string): void {
    if (table) {
      this.cache.delete(table);
      console.log(`🗑️ Cache invalidé pour ${table}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cache complètement invalidé');
    }
  }
}

// Instance singleton
export const databaseService = new DatabaseServiceImpl();

// Fonction utilitaire pour générer des données de test - SUPPRIMÉE
// Cette fonction a été supprimée pour éviter la création automatique de "Magasin Principal"
// Les utilisateurs doivent créer leurs propres emplacements via l'interface

// Fonction utilitaire pour initialiser l'entrepôt d'un produit
export const initializeWarehouse = async (productId: string, initialQuantity: number = 0) => {
  try {
    // Récupérer les informations de l'utilisateur
    const { getCurrentUser } = await import('../utils/userInfo');
    const user = await getCurrentUser();
    
    const warehouseData: any = {
      product_id: productId,
      quantity_available: initialQuantity,
      quantity_reserved: 0,
      warehouse_min: 50,              // Alerte si < 50 unités
      warehouse_max: 5000,            // Capacité max 5000 unités
      location: 'Entrepôt Principal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending' as const,
    };
    
    // Ajouter les champs created_by si l'utilisateur est connecté
    if (user) {
      warehouseData.created_by = user.uid;
      warehouseData.created_by_name = user.email || user.displayName || 'Utilisateur';
    }
    
    const warehouseId = await databaseService.insert('warehouse', warehouseData);
    
    console.log(`🏢 Entrepôt initialisé pour produit ${productId}: ${warehouseId}`);
    return warehouseId;
  } catch (error) {
    console.error('❌ Erreur initialisation entrepôt:', error);
    throw error;
  }
};