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

export interface Location {
  id: string;
  name: string;
  address: string;
  location_type: 'warehouse' | 'store' | 'supplier';
  contact_person?: string;
  phone?: string;
  is_active: boolean;
  created_at: any;
  updated_at: any;
  sync_status: 'synced' | 'pending' | 'error';
}

export interface Inventory {
  id: string;
  product_id: string;
  location_id: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_min: number;
  quantity_max: number;
  last_movement_date?: string;
  last_movement_type?: string;
  created_at: any;
  updated_at: any;
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
  createStock(stock: Omit<Stock, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
  updateStock(id: string, stock: Partial<Stock>): Promise<void>;
  updateStockByProductId(productId: string, updates: Partial<Stock>): Promise<void>;
  deleteStock(id: string): Promise<void>;
  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
  // Customers
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<string>;
  deleteCustomer(id: string): Promise<void>;
  // Locations
  getLocations(): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | null>;
  createLocation(location: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
  updateLocation(id: string, location: Partial<Location>): Promise<void>;
  deleteLocation(id: string): Promise<void>;
  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryByLocation(locationId: string): Promise<Inventory[]>;
  getInventoryByProduct(productId: string): Promise<Inventory[]>;
  createInventory(inventory: Omit<Inventory, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
  updateInventory(id: string, inventory: Partial<Inventory>): Promise<void>;
  deleteInventory(id: string): Promise<void>;
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
        // Vérifier l'authentification Firebase
        const { auth } = await import('./firebase-config');
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.warn('⚠️ [FIREBASE SERVICE] Pas d\'utilisateur Firebase, retour tableau vide');
          return [];
        }
        
        const productsRef = collection(db, 'products');
        // Filtrer par created_by pour isolation des données
        // Note: orderBy supprimé pour éviter le besoin d'index composite
        // Le tri sera fait côté application si nécessaire
        const q = query(productsRef, where('created_by', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
          updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
        })) as Product[];
        
        console.log(`📦 ${products.length} produits récupérés depuis Firestore (utilisateur: ${currentUser.email})`);
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
      // Vérifier si le produit existe déjà dans Firebase
      if (product.sku) {
        console.log('🔍 [FIREBASE DEBUG] Vérification doublon par SKU:', product.sku);
        const existingProducts = await this.getProducts();
        const duplicate = existingProducts.find(p => p.sku === product.sku);
        if (duplicate) {
          console.log('⚠️ [FIREBASE DEBUG] Doublon détecté par SKU:', duplicate.id);
          throw new Error(`Produit avec SKU "${product.sku}" existe déjà dans Firebase`);
        }
      }
      
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
      
      // console.error('❌ [FIREBASE DEBUG] Erreur création produit:', error);
      // console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
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
      console.log('🔥 [FIREBASE SERVICE] Récupération du stock depuis Firestore');
      console.log('🔍 [FIREBASE SERVICE] Vérification de l\'authentification Firebase...');
      
      // Vérifier l'état d'authentification Firebase
      const { auth } = await import('./firebase-config');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.warn('⚠️ [FIREBASE SERVICE] Aucun utilisateur Firebase authentifié');
        console.warn('⚠️ [FIREBASE SERVICE] Mode dégradé : utilisation des données locales uniquement');
        console.warn('💡 [FIREBASE SERVICE] Pour synchroniser avec Firestore, créez le compte dans Firebase Auth');
        
        // Retourner un tableau vide au lieu de lancer une erreur
        // L'application continuera de fonctionner en mode local (AsyncStorage)
        return [];
      }
      
      console.log(`✅ [FIREBASE SERVICE] Utilisateur Firebase authentifié: ${currentUser.email} (UID: ${currentUser.uid})`);
      
      // Filtrer par created_by pour respecter les règles de sécurité Firestore
      const stockRef = collection(db, 'stock');
      const q = query(stockRef, where('created_by', '==', currentUser.uid));
      console.log('🔍 [FIREBASE SERVICE] Requête avec filtre created_by =', currentUser.uid);
      
      const snapshot = await getDocs(q);
      
      const stock = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
      })) as Stock[];
      
      console.log(`📊 [FIREBASE SERVICE] ${stock.length} entrées de stock récupérées (filtrées par utilisateur ${currentUser.email})`);
      return stock;
    } catch (error) {
      console.error('❌ [FIREBASE SERVICE] Erreur récupération stock:', error);
      if (error instanceof Error) {
        console.error('❌ [FIREBASE SERVICE] Message d\'erreur:', error.message);
        console.error('❌ [FIREBASE SERVICE] Stack trace:', error.stack);
      }
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

  async createStock(stock: Omit<Stock, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    console.log('🚀 [FIREBASE DEBUG] Début createStock');
    console.log('🚀 [FIREBASE DEBUG] Stock reçu:', stock);
    
    try {
      console.log('🔄 [FIREBASE DEBUG] Création collection reference');
      const stockRef = collection(db, 'stock');
      const now = serverTimestamp();
      
      // Filtrer les valeurs undefined (Firestore ne les accepte pas)
      console.log('🔄 [FIREBASE DEBUG] Filtrage des valeurs undefined');
      const cleanStock = Object.fromEntries(
        Object.entries(stock).filter(([_, value]) => value !== undefined)
      ) as any;
      console.log('✅ [FIREBASE DEBUG] Stock nettoyé:', cleanStock);
      
      const stockData = {
        ...cleanStock,
        created_at: now,
        updated_at: now,
        sync_status: 'synced' as const,
      };
      console.log('📦 [FIREBASE DEBUG] StockData final:', stockData);
      
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
      
      const addDocPromise = addDoc(stockRef, stockData);
      
      const docRef = await Promise.race([addDocPromise, timeoutPromise]) as any;
      console.log('✅ [FIREBASE DEBUG] addDoc terminé, ID:', docRef.id);
      
      console.log('✅ [FIREBASE DEBUG] Stock créé dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout création stock (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - création locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      
      console.error('❌ [FIREBASE DEBUG] Erreur création stock:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async updateStock(id: string, updates: Partial<Stock>): Promise<void> {
    try {
      console.log('🔄 [FIREBASE DEBUG] Début updateStock');
      console.log('🔄 [FIREBASE DEBUG] ID reçu:', id);
      console.log('🔄 [FIREBASE DEBUG] Updates reçus:', updates);

      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, mise à jour locale uniquement' : '📱 Firebase désactivé, mise à jour locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      console.log('🔄 [FIREBASE DEBUG] Création document reference avec ID:', id);
      const stockRef = doc(db, 'stock', id);
      
      // Vérifier si le document existe
      console.log('🔍 [FIREBASE DEBUG] Vérification existence document');
      const docSnap = await getDoc(stockRef);
      
      if (!docSnap.exists()) {
        console.log('⚠️ [FIREBASE DEBUG] Document stock introuvable, suppression de l\'opération');
        throw new Error('Document stock introuvable dans Firebase');
      }
      
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
        updateDoc(stockRef, updateData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase: updateStock a pris plus de 3 secondes')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] updateDoc terminé');
      console.log('✅ [FIREBASE DEBUG] Stock mis à jour dans Firestore:', id);
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout mise à jour stock (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - mise à jour locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      // Gérer le cas où le document n'existe pas
      if (error instanceof Error && error.message.includes('Document stock introuvable')) {
        console.log('⚠️ [FIREBASE DEBUG] Document stock introuvable, opération sera supprimée');
        throw error;
      }
      console.error('❌ [FIREBASE DEBUG] Erreur mise à jour stock:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async deleteStock(id: string): Promise<void> {
    try {
      console.log('🗑️ [FIREBASE DEBUG] Début deleteStock');
      console.log('🗑️ [FIREBASE DEBUG] ID reçu:', id);

      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, suppression locale uniquement' : '📱 Firebase désactivé, suppression locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      console.log('🗑️ [FIREBASE DEBUG] Création document reference avec ID:', id);
      const stockRef = doc(db, 'stock', id);
      
      // Vérifier si le document existe
      console.log('🔍 [FIREBASE DEBUG] Vérification existence document');
      const docSnap = await getDoc(stockRef);
      
      if (!docSnap.exists()) {
        console.log('⚠️ [FIREBASE DEBUG] Document stock introuvable, suppression de l\'opération');
        throw new Error('Document stock introuvable dans Firebase');
      }
      
      console.log('🗑️ [FIREBASE DEBUG] Suppression du document');
      await Promise.race([
        deleteDoc(stockRef),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase: deleteStock a pris plus de 3 secondes')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] deleteDoc terminé');
      console.log('✅ [FIREBASE DEBUG] Stock supprimé de Firestore:', id);
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout suppression stock (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - suppression locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      // Gérer le cas où le document n'existe pas
      if (error instanceof Error && error.message.includes('Document stock introuvable')) {
        console.log('⚠️ [FIREBASE DEBUG] Document stock introuvable, opération sera supprimée');
        throw error;
      }
      console.error('❌ [FIREBASE DEBUG] Erreur suppression stock:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async updateStockByProductId(productId: string, updates: Partial<Stock>): Promise<void> {
    try {
      console.log('🔄 [STOCK BY PRODUCT] Début updateStockByProductId');
      console.log('🔄 [STOCK BY PRODUCT] Product ID:', productId);
      console.log('🔄 [STOCK BY PRODUCT] Updates:', updates);

      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé' : '📱 Firebase désactivé');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      // Chercher le stock par product_id
      const stockRef = collection(db, 'stock');
      const q = query(stockRef, where('product_id', '==', productId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('⚠️ [STOCK BY PRODUCT] Aucun stock trouvé pour product_id:', productId);
        throw new Error('Stock introuvable pour ce produit');
      }

      // Mettre à jour le premier document trouvé
      const stockDoc = snapshot.docs[0];
      const stockDocRef = doc(db, 'stock', stockDoc.id);

      // Filtrer les valeurs undefined
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      ) as any;

      const updateData = {
        ...cleanUpdates,
        updated_at: serverTimestamp(),
        sync_status: 'synced',
      };

      console.log('✅ [STOCK BY PRODUCT] UpdateData final:', updateData);
      
      await updateDoc(stockDocRef, updateData);

      console.log('✅ [STOCK BY PRODUCT] Stock mis à jour:', stockDoc.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - mise à jour locale uniquement');
        throw new Error('Mode offline');
      }
      console.error('❌ [STOCK BY PRODUCT] Erreur:', error);
      throw error;
    }
  }


  // === SALES ===
  async getSales(): Promise<Sale[]> {
    try {
      console.log('🔥 Récupération des ventes depuis Firestore');
      
      // Vérifier l'authentification Firebase
      const { auth } = await import('./firebase-config');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.warn('⚠️ [FIREBASE SERVICE] Pas d\'utilisateur Firebase, retour tableau vide');
        return [];
      }
      
      const salesRef = collection(db, 'sales');
      // Filtrer par user_id pour isolation des données
      // Note: orderBy supprimé pour éviter le besoin d'index composite
      const q = query(salesRef, where('user_id', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
      })) as unknown as Sale[];
      
      console.log(`💰 ${sales.length} ventes récupérées (utilisateur: ${currentUser.email})`);
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
      
      // Vérifier l'authentification Firebase
      const { auth } = await import('./firebase-config');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.warn('⚠️ [FIREBASE SERVICE] Pas d\'utilisateur Firebase, retour tableau vide');
        return [];
      }
      
      const customersRef = collection(db, 'customers');
      // Filtrer par created_by pour isolation des données
      // Note: orderBy supprimé pour éviter le besoin d'index composite
      const q = query(customersRef, where('created_by', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      
      const customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
      })) as Customer[];
      
      console.log(`👥 ${customers.length} clients récupérés (utilisateur: ${currentUser.email})`);
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

  async deleteCustomer(id: string): Promise<void> {
    try {
      console.log('🗑️ [FIREBASE DEBUG] Début deleteCustomer');
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
      const customerRef = doc(db, 'customers', firebaseId);

      console.log('🗑️ [FIREBASE DEBUG] Appel deleteDoc avec timeout');
      
      // Utiliser Promise.race pour timeout
      await Promise.race([
        deleteDoc(customerRef),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), 10000)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] Client supprimé dans Firestore:', firebaseId);
    } catch (error) {
      // Gérer le timeout Firebase silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout suppression client (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - suppression locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      console.error('❌ [FIREBASE DEBUG] Erreur suppression client:', error);
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

  // ===== MÉTHODES POUR LES CATÉGORIES =====

  async getCategories(): Promise<any[]> {
    try {
      console.log('🔥 Récupération des catégories depuis Firestore avec timeout');
      
      // Vérifier si Firebase est activé ou en mode offline forcé
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé' : '📱 Firebase désactivé, retour tableau vide');
        return [];
      }

      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise<any[]>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout Firebase: getCategories a pris plus de 3 secondes')), FIREBASE_TIMEOUT);
      });
      
      const getCategoriesPromise = (async () => {
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(query(categoriesRef, orderBy('created_at', 'desc')));
        
        const categories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
          updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
        })) as any[];
        
        console.log(`📂 ${categories.length} catégories récupérées depuis Firestore`);
        return categories;
      })();
      
      return await Promise.race([getCategoriesPromise, timeoutPromise]);
    } catch (error) {
      // Gérer les timeouts silencieusement pour éviter les erreurs UI
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout (normal en développement)');
        return []; // Retourner un tableau vide au lieu de lancer une erreur
      }
      console.error('❌ Erreur récupération catégories:', error);
      throw error;
    }
  }

  async getCategoryById(id: string): Promise<any | null> {
    try {
      const categoryRef = doc(db, 'categories', id);
      const snapshot = await getDoc(categoryRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
          created_at: snapshot.data().created_at?.toDate?.()?.toISOString() || snapshot.data().created_at,
          updated_at: snapshot.data().updated_at?.toDate?.()?.toISOString() || snapshot.data().updated_at,
        } as any;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération catégorie:', error);
      throw error;
    }
  }

  async createCategory(category: Omit<any, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    console.log('🚀 [FIREBASE DEBUG] Début createCategory');
    console.log('🚀 [FIREBASE DEBUG] Category reçue:', category);
    
    try {
      console.log('🔄 [FIREBASE DEBUG] Création collection reference');
      const categoriesRef = collection(db, 'categories');
      const now = serverTimestamp();
      
      // Filtrer les valeurs undefined (Firestore ne les accepte pas)
      console.log('🔄 [FIREBASE DEBUG] Filtrage des valeurs undefined');
      const cleanCategory = Object.fromEntries(
        Object.entries(category).filter(([_, value]) => value !== undefined)
      ) as any;
      console.log('✅ [FIREBASE DEBUG] Category nettoyée:', cleanCategory);
      
      const categoryData = {
        ...cleanCategory,
        created_at: now,
        updated_at: now,
        sync_status: 'synced' as const,
      };
      console.log('📦 [FIREBASE DEBUG] CategoryData final:', categoryData);
      
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
      
      const addDocPromise = addDoc(categoriesRef, categoryData);
      
      const docRef = await Promise.race([addDocPromise, timeoutPromise]) as any;
      console.log('✅ [FIREBASE DEBUG] addDoc terminé, ID:', docRef.id);
      
      console.log('✅ [FIREBASE DEBUG] Catégorie créée dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      // Gérer les timeouts et mode offline silencieusement
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout création catégorie (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      
      // Gérer le mode offline silencieusement
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - création locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      
      console.error('❌ [FIREBASE DEBUG] Erreur création catégorie:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<any>): Promise<void> {
    try {
      console.log('🔄 [FIREBASE DEBUG] Début updateCategory');
      console.log('🔄 [FIREBASE DEBUG] ID reçu:', id);
      console.log('🔄 [FIREBASE DEBUG] Updates reçus:', updates);

      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, mise à jour locale uniquement' : '📱 Firebase désactivé, mise à jour locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      let firebaseId = id;
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
      const categoryRef = doc(db, 'categories', firebaseId);
      
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
      
      await Promise.race([
        updateDoc(categoryRef, updateData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase: updateCategory a pris plus de 3 secondes')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] updateDoc terminé');
      console.log('✅ [FIREBASE DEBUG] Catégorie mise à jour dans Firestore:', id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout mise à jour catégorie (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - mise à jour locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      console.error('❌ [FIREBASE DEBUG] Erreur mise à jour catégorie:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      console.log('🗑️ [FIREBASE DEBUG] Début deleteCategory');
      console.log('🗑️ [FIREBASE DEBUG] ID reçu:', id);

      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, suppression locale uniquement' : '📱 Firebase désactivé, suppression locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      let firebaseId = id;
      
      // Vérifier si c'est un ID local ou Firebase
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

      console.log('🔄 [FIREBASE DEBUG] Création document reference avec ID:', firebaseId);
      const categoryRef = doc(db, 'categories', firebaseId);
      
      console.log('🔄 [FIREBASE DEBUG] Appel deleteDoc avec timeout');
      
      await Promise.race([
        deleteDoc(categoryRef),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase: deleteCategory a pris plus de 3 secondes')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] deleteDoc terminé');
      console.log('✅ [FIREBASE DEBUG] Catégorie supprimée de Firestore:', id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout suppression catégorie (normal en développement)');
        throw new Error('Firebase temporairement indisponible');
      }
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log('📱 Mode offline - suppression locale uniquement (normal)');
        throw new Error('Mode offline');
      }
      console.error('❌ [FIREBASE DEBUG] Erreur suppression catégorie:', error);
      console.error('❌ [FIREBASE DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
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

  // ==================== LOCATIONS (EMPLACEMENTS) ====================
  
  async getLocations(): Promise<Location[]> {
    try {
      console.log('🏢 Récupération des emplacements depuis Firestore');
      
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé' : '📱 Firebase désactivé, retour tableau vide');
        return [];
      }

      // Vérifier l'authentification Firebase
      const { auth } = await import('./firebase-config');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.warn('⚠️ [FIREBASE SERVICE] Pas d\'utilisateur Firebase, retour tableau vide');
        return [];
      }

      const locationsRef = collection(db, 'locations');
      // Filtrer par created_by pour isolation des données
      const q = query(locationsRef, where('created_by', '==', currentUser.uid));
      const querySnapshot = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      const locations: Location[] = [];
      querySnapshot.forEach((doc) => {
        locations.push({
          id: doc.id,
          ...doc.data()
        } as Location);
      });

      console.log(`📦 ${locations.length} emplacements récupérés (utilisateur: ${currentUser.email})`);
      return locations;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        console.log('⚠️ Firebase timeout (normal en développement)');
      }
      return [];
    }
  }

  async getLocationById(id: string): Promise<Location | null> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        return null;
      }

      const locationRef = doc(db, 'locations', id);
      const docSnap = await getDoc(locationRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Location;
    } catch (error) {
      console.log('⚠️ Erreur récupération emplacement:', error);
      return null;
    }
  }

  async createLocation(location: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      console.log('🚀 [FIREBASE DEBUG] Début createLocation');
      
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        console.log(FORCE_OFFLINE_MODE ? '📱 Mode OFFLINE forcé, création locale uniquement' : '📱 Firebase désactivé, création locale uniquement');
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      const locationsRef = collection(db, 'locations');
      
      const locationData = {
        ...location,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        sync_status: 'synced' as const,
      };

      const docRef = await Promise.race([
        addDoc(locationsRef, locationData),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] Emplacement créé dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        throw new Error('Firebase temporairement indisponible');
      }
      if (error instanceof Error && error.message.includes('Mode offline')) {
        throw new Error('Mode offline');
      }
      throw error;
    }
  }

  async updateLocation(id: string, updates: Partial<Location>): Promise<void> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      const locationRef = doc(db, 'locations', id);
      
      await Promise.race([
        updateDoc(locationRef, {
          ...updates,
          updated_at: serverTimestamp(),
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ Emplacement mis à jour dans Firestore');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        throw new Error('Firebase temporairement indisponible');
      }
      throw error;
    }
  }

  async deleteLocation(id: string): Promise<void> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      const locationRef = doc(db, 'locations', id);
      
      await Promise.race([
        deleteDoc(locationRef),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ Emplacement supprimé de Firestore');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        throw new Error('Firebase temporairement indisponible');
      }
      throw error;
    }
  }

  // ==================== INVENTORY (INVENTAIRE) ====================
  
  async getInventory(): Promise<Inventory[]> {
    try {
      console.log('📦 Récupération de l\'inventaire depuis Firestore');
      
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        return [];
      }

      // Vérifier l'authentification Firebase
      const { auth } = await import('./firebase-config');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.warn('⚠️ [FIREBASE SERVICE] Pas d\'utilisateur Firebase, retour tableau vide');
        return [];
      }

      const inventoryRef = collection(db, 'inventory');
      // Filtrer par created_by pour isolation des données
      const q = query(inventoryRef, where('created_by', '==', currentUser.uid));
      const querySnapshot = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      const inventory: Inventory[] = [];
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        } as Inventory);
      });

      console.log(`📦 ${inventory.length} entrées d\'inventaire récupérées (utilisateur: ${currentUser.email})`);
      return inventory;
    } catch (error) {
      return [];
    }
  }

  async getInventoryByLocation(locationId: string): Promise<Inventory[]> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        return [];
      }

      const inventoryRef = collection(db, 'inventory');
      const q = query(inventoryRef, where('location_id', '==', locationId));
      
      const querySnapshot = await getDocs(q);
      const inventory: Inventory[] = [];
      
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        } as Inventory);
      });

      return inventory;
    } catch (error) {
      return [];
    }
  }

  async getInventoryByProduct(productId: string): Promise<Inventory[]> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        return [];
      }

      const inventoryRef = collection(db, 'inventory');
      const q = query(inventoryRef, where('product_id', '==', productId));
      
      const querySnapshot = await getDocs(q);
      const inventory: Inventory[] = [];
      
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        } as Inventory);
      });

      return inventory;
    } catch (error) {
      return [];
    }
  }

  async createInventory(inventory: Omit<Inventory, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      console.log('🚀 [FIREBASE DEBUG] Début createInventory');
      
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      const inventoryRef = collection(db, 'inventory');
      
      const inventoryData = {
        ...inventory,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        sync_status: 'synced' as const,
      };

      const docRef = await Promise.race([
        addDoc(inventoryRef, inventoryData),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ [FIREBASE DEBUG] Inventaire créé dans Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        throw new Error('Firebase temporairement indisponible');
      }
      throw error;
    }
  }

  async updateInventory(id: string, updates: Partial<Inventory>): Promise<void> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      const inventoryRef = doc(db, 'inventory', id);
      
      await Promise.race([
        updateDoc(inventoryRef, {
          ...updates,
          updated_at: serverTimestamp(),
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ Inventaire mis à jour dans Firestore');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        throw new Error('Firebase temporairement indisponible');
      }
      throw error;
    }
  }

  async deleteInventory(id: string): Promise<void> {
    try {
      if (!FIREBASE_ENABLED || !db || FORCE_OFFLINE_MODE) {
        throw new Error(FORCE_OFFLINE_MODE ? 'Mode offline' : 'Firebase désactivé');
      }

      const inventoryRef = doc(db, 'inventory', id);
      
      await Promise.race([
        deleteDoc(inventoryRef),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Firebase')), FIREBASE_TIMEOUT)
        )
      ]);

      console.log('✅ Inventaire supprimé de Firestore');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Timeout Firebase')) {
        throw new Error('Firebase temporairement indisponible');
      }
      throw error;
    }
  }

}

export const firebaseService = new FirebaseServiceImpl();