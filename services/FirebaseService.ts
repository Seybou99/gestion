// Service Firebase réel avec Firestore
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { getFirebaseId, isValidLocalId } from '../utils/firebaseIdMapper';
import { db, FIREBASE_ENABLED, FIREBASE_TIMEOUT, FORCE_OFFLINE_MODE } from './firebase-config';

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
  images?: string[];
  is_active: boolean;
  created_at: any;
  updated_at: any;
  sync_status: 'synced' | 'pending' | 'error';
}

export interface Stock {
  id: string;
  product_id: string;
  location_id: string;
  quantity_current: number;
  quantity_min: number;
  quantity_max: number;
  last_movement_date?: any;
  last_movement_type?: string;
  created_at: any;
  updated_at: any;
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
  sale_date: any;
  created_by: string;
  notes?: string;
  sync_status: 'synced' | 'pending' | 'error';
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
  created_at: any;
  sync_status: 'synced' | 'pending' | 'error';
}

// Interface pour le service Firebase
export interface FirebaseService {
  init(): Promise<void>;
  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
  updateProduct(id: string, product: Partial<Product>): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  // Stock
  getStock(): Promise<Stock[]>;
  getStockByProduct(productId: string): Promise<Stock | null>;
  updateStock(id: string, stock: Partial<Stock>): Promise<void>;
  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
  // Customers
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<string>;
  // Search
  searchProducts(searchTerm: string): Promise<Product[]>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
}

class FirebaseServiceImpl implements FirebaseService {
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🔥 Service Firebase initialisé avec Firestore');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erreur initialisation Firebase:', error);
      throw error;
    }
  }

  // === PRODUCTS ===
  async getProducts(): Promise<Product[]> {
    try {
      console.log('🔥 Récupération des produits depuis Firestore avec timeout');
      
      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé' : '📱 Firebase désactivé, retour tableau vide');
        return [];
      }

      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise<Product[]>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout Firebase: getProducts a pris plus de 3 secondes')), FIREBASE_TIMEOUT);
      });
      
      const getProductsPromise = (async () => {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(query(productsRef, orderBy('created_at', 'desc')));
        
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
          updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
        })) as Product[];
        
        console.log(`📦 ${products.length} produits récupérés depuis Firestore`);
        return products;
      })();
      
      return await Promise.race([getProductsPromise, timeoutPromise]);
    } catch (error) {
      // Gérer les timeouts silencieusement pour éviter les erreurs UI
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout (normal en développement)');
        return []; // Retourner un tableau vide au lieu de lancer une erreur
      }
      console.error('❌ Erreur récupération produits:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const productRef = doc(db, 'products', id);
      const snapshot = await getDoc(productRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
          created_at: snapshot.data().created_at?.toDate?.()?.toISOString() || snapshot.data().created_at,
          updated_at: snapshot.data().updated_at?.toDate?.()?.toISOString() || snapshot.data().updated_at,
        } as Product;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération produit:', error);
      throw error;
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    console.log('🚀 [FIREBASE DEBUG] Début createProduct');
    console.log('🚀 [FIREBASE DEBUG] Product reçu:', product);
    
    try {
      console.log('🔄 [FIREBASE DEBUG] Création collection reference');
      const productsRef = collection(db, 'products');
      const now = serverTimestamp();
      
      // Filtrer les valeurs undefined (Firestore ne les accepte pas)
      console.log('🔄 [FIREBASE DEBUG] Filtrage des valeurs undefined');
      const cleanProduct = Object.fromEntries(
        Object.entries(product).filter(([_, value]) => value !== undefined)
      ) as any;
      console.log('✅ [FIREBASE DEBUG] Product nettoyé:', cleanProduct);
      
      const productData = {
        ...cleanProduct,
        created_at: now,
        updated_at: now,
        sync_status: 'synced' as const,
      };
      console.log('📦 [FIREBASE DEBUG] ProductData final:', productData);
      
      console.log('🔄 [FIREBASE DEBUG] Appel addDoc avec timeout');
      
      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, création locale uniquement' : '📱 Firebase désactivé, création locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout Firebase: addDoc a pris plus de 3 secondes')), FIREBASE_TIMEOUT);
      });
      
      const addDocPromise = addDoc(productsRef, productData);
      
      const docRef = await Promise.race([addDocPromise, timeoutPromise]) as any;
      console.log('✅ [FIREBASE DEBUG] addDoc terminé, ID:', docRef.id);
      
      console.log('✅ [FIREBASE DEBUG] Produit créé dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout création produit (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - création locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      
      console.error('❌ [FIREBASE DEBUG] Erreur création produit:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    try {
      console.log('🔄 [FIREBASE DEBUG] Début updateProduct');
      console.log('🔄 [FIREBASE DEBUG] ID reçu:', id);
      console.log('🔄 [FIREBASE DEBUG] Updates reçus:', updates);

      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, mise à jour locale uniquement' : '📱 Firebase désactivé, mise à jour locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      // Déterminer l'ID Firebase à utiliser
      let firebaseId = id;
      
      // Si l'ID reçu est un ID local, chercher l'ID Firebase correspondant
      if (isValidLocalId(id)) {
        console.log('🔄 [FIREBASE DEBUG] ID local détecté, recherche Firebase ID...');
        const foundFirebaseId = await getFirebaseId(id);
        if (foundFirebaseId) {
          firebaseId = foundFirebaseId;
          console.log('✅ [FIREBASE DEBUG] Firebase ID trouvé:', firebaseId);
        } else {
          console.log('⚠️ [FIREBASE DEBUG] Aucun Firebase ID trouvé, utilisation ID local');
        }
      } else if ((updates as any).firebase_id) {
        firebaseId = (updates as any).firebase_id;
        console.log('🔄 [FIREBASE DEBUG] Utilisation firebase_id des updates:', firebaseId);
      } else {
        console.log('🔄 [FIREBASE DEBUG] Utilisation ID direct:', firebaseId);
      }

      console.log('🔄 [FIREBASE DEBUG] Création document reference avec ID:', firebaseId);
      const productRef = doc(db, 'products', firebaseId);
      
      // Filtrer les valeurs undefined (Firestore ne les accepte pas)
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      ) as any;

      const updateData = {
        ...cleanUpdates,
        updated_at: serverTimestamp(),
        sync_status: 'synced',
      };

      console.log('✅ [FIREBASE DEBUG] UpdateData final:', updateData);
      console.log('🔄 [FIREBASE DEBUG] Appel updateDoc avec timeout');
      
      // Utiliser Promise.race pour timeout
      await Promise.race([
        updateDoc(productRef, updateData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase: updateProduct a pris plus de 3 secondes')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] updateDoc terminé');
      console.log('✅ [FIREBASE DEBUG] Produit mis à jour dans Firestore:', id);
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout mise à jour produit (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - mise à jour locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      console.error('❌ [FIREBASE DEBUG] Erreur mise à jour produit:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      console.log('🗑️ [FIREBASE DEBUG] Début deleteProduct');
      console.log('🗑️ [FIREBASE DEBUG] ID reçu:', id);

      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, suppression locale uniquement' : '📱 Firebase désactivé, suppression locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      // Déterminer l'ID Firebase à utiliser pour la suppression
      let firebaseId = id;
      
      // Si l'ID reçu est un ID local, chercher l'ID Firebase correspondant
      if (isValidLocalId(id)) {
        console.log('🔄 [FIREBASE DEBUG] ID local détecté, recherche Firebase ID...');
        const foundFirebaseId = await getFirebaseId(id);
        if (foundFirebaseId) {
          firebaseId = foundFirebaseId;
          console.log('✅ [FIREBASE DEBUG] Firebase ID trouvé:', firebaseId);
        } else {
          console.log('⚠️ [FIREBASE DEBUG] Aucun Firebase ID trouvé, utilisation ID local');
        }
      } else {
        console.log('🔄 [FIREBASE DEBUG] ID Firebase direct:', firebaseId);
      }

      console.log('🗑️ [FIREBASE DEBUG] Création document reference avec ID:', firebaseId);
      const productRef = doc(db, 'products', firebaseId);

      console.log('🗑️ [FIREBASE DEBUG] Appel deleteDoc avec timeout');
      
      // Utiliser Promise.race pour timeout
      await Promise.race([
        deleteDoc(productRef),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase: deleteProduct a pris plus de 3 secondes')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] deleteDoc terminé');
      console.log('✅ [FIREBASE DEBUG] Produit supprimé de Firestore:', id);
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout suppression produit (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - suppression locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      console.error('❌ [FIREBASE DEBUG] Erreur suppression produit:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  // === STOCK ===
  async getStock(): Promise<Stock[]> {
    try {
      console.log('🔥 Récupération du stock depuis Firestore');
      const stockRef = collection(db, 'stock');
      const snapshot = await getDocs(stockRef);
      
      const stock = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
      })) as Stock[];
      
      console.log(`📊 ${stock.length} entrées de stock récupérées`);
      return stock;
    } catch (error) {
      console.error('❌ Erreur récupération stock:', error);
      throw error;
    }
  }

  async getStockByProduct(productId: string): Promise<Stock | null> {
    try {
      const stockRef = collection(db, 'stock');
      const q = query(stockRef, where('product_id', '==', productId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
          updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
        } as Stock;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération stock par produit:', error);
      throw error;
    }
  }

  async updateStock(id: string, updates: Partial<Stock>): Promise<void> {
    try {
      const stockRef = doc(db, 'stock', id);
      await updateDoc(stockRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
      console.log('✅ Stock mis à jour dans Firestore:', id);
    } catch (error) {
      console.error('❌ Erreur mise à jour stock:', error);
      throw error;
    }
  }

  // === SALES ===
  async getSales(): Promise<Sale[]> {
    try {
      console.log('🔥 Récupération des ventes depuis Firestore');
      const salesRef = collection(db, 'sales');
      const snapshot = await getDocs(query(salesRef, orderBy('sale_date', 'desc')));
      
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
      })) as unknown as Sale[];
      
      console.log(`💰 ${sales.length} ventes récupérées`);
      return sales;
    } catch (error) {
      console.error('❌ Erreur récupération ventes:', error);
      throw error;
    }
  }

  async createSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const salesRef = collection(db, 'sales');
      const now = serverTimestamp();
      
      const saleData = {
        ...sale,
        created_at: now,
        updated_at: now,
        sync_status: 'synced' as const,
      };
      
      const docRef = await addDoc(salesRef, saleData);
      console.log('✅ Vente créée dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur création vente:', error);
      throw error;
    }
  }

  // === CUSTOMERS ===
  async getCustomers(): Promise<Customer[]> {
    try {
      console.log('🔥 Récupération des clients depuis Firestore');
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(query(customersRef, orderBy('created_at', 'desc')));
      
      const customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
      })) as Customer[];
      
      console.log(`👥 ${customers.length} clients récupérés`);
      return customers;
    } catch (error) {
      console.error('❌ Erreur récupération clients:', error);
      throw error;
    }
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<string> {
    try {
      const customersRef = collection(db, 'customers');
      const now = serverTimestamp();
      
      const customerData = {
        ...customer,
        created_at: now,
        sync_status: 'synced' as const,
      };
      
      const docRef = await addDoc(customersRef, customerData);
      console.log('✅ Client créé dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur création client:', error);
      throw error;
    }
  }

  // === SEARCH ===
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const products = await this.getProducts();
      return products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error('❌ Erreur recherche produits:', error);
      throw error;
    }
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('category_id', '==', categoryId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
      })) as Product[];
    } catch (error) {
      console.error('❌ Erreur récupération produits par catégorie:', error);
      throw error;
    }
  }

  // === SYNC ===
  async getUpdatesSince(timestamp: string): Promise<any[]> {
    try {
      console.log(`🔍 Récupération des mises à jour depuis Firestore depuis ${timestamp}`);
      // Implémentation pour récupérer les mises à jour depuis une date
      return [];
    } catch (error) {
      console.error('❌ Erreur récupération mises à jour:', error);
      throw error;
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      // Test simple de connectivité
      await getDocs(collection(db, 'products'));
      console.log('✅ Connectivité Firebase vérifiée');
      return true;
    } catch (error) {
      console.error('❌ Erreur connectivité Firebase:', error);
      return false;
    }
  }
}

export const firebaseService = new FirebaseServiceImpl();