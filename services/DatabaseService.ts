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
}

export interface Sale {
  id: string;
  customer_id?: string;
  location_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status: 'paid' | 'pending' | 'refunded';
  sale_date: string;
  created_by: string;
  notes?: string;
  sync_status: 'synced' | 'pending' | 'error';
  sync_timestamp?: string;
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
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
    const tables = ['products', 'categories', 'stock', 'sales', 'sale_items', 'customers', 'sync_queue', 'sync_metadata'];
    
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
        throw new Error(`Item avec l'id ${id} non trouvé dans ${table}`);
      }
    } catch (error) {
      console.error(`❌ Erreur mise à jour dans ${table}:`, error);
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
    return productsWithStock.filter(product => 
      product.quantity_current <= product.quantity_min
    );
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
}

// Instance singleton
export const databaseService = new DatabaseServiceImpl();

// Fonction utilitaire pour générer des données de test (sans catégories)
export const seedTestData = async () => {
  try {
    console.log('🌱 Génération des données de test...');

    // Créer un emplacement de test
    const locationId = await databaseService.insert('locations', {
      name: 'Magasin Principal',
      address: 'Bamako, Mali',
      location_type: 'store',
      is_active: true,
      created_at: new Date().toISOString(),
      sync_status: 'synced' as const,
    });

    // Créer des clients de test
    const customers = [
      {
        name: 'Marie Diallo',
        phone: '+223 6 12 34 56 78',
        email: 'marie.diallo@email.com',
        address: 'Bamako, Mali',
        customer_type: 'retail' as const,
        credit_limit: 100000,
        credit_balance: 0,
        created_at: new Date().toISOString(),
        sync_status: 'synced' as const,
      },
      {
        name: 'Amadou Traoré',
        phone: '+223 7 23 45 67 89',
        email: 'amadou.traore@email.com',
        address: 'Ségou, Mali',
        customer_type: 'wholesale' as const,
        credit_limit: 500000,
        credit_balance: 25000,
        created_at: new Date().toISOString(),
        sync_status: 'synced' as const,
      },
    ];

    const customerIds: string[] = [];
    for (const customer of customers) {
      const id = await databaseService.insert('customers', customer);
      customerIds.push(id);
    }

    console.log('✅ Données de test générées avec succès');
    console.log(`👥 ${customerIds.length} clients créés`);
    console.log(`🏪 1 emplacement créé`);
    console.log('📂 Les catégories doivent être créées via l\'interface utilisateur');

  } catch (error) {
    console.error('❌ Erreur génération données de test:', error);
    throw error;
  }
};