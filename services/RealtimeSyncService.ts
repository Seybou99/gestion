// Service de synchronisation temps réel avec Firestore
// Utilise les listeners Firestore pour une synchronisation instantanée
import { collection, getDocs, onSnapshot, query, Unsubscribe, where } from 'firebase/firestore';
import { getCurrentUser } from '../utils/userInfo';
import { databaseService } from './DatabaseService';
import { db } from './firebase-config';

class RealtimeSyncService {
  private listeners: Map<string, Unsubscribe> = new Map();
  private isActive = false;
  private processedIds: Set<string> = new Set(); // IDs déjà traités pour éviter les doublons

  /**
   * Marque un ID comme traité pour éviter les doublons
   */
  markAsProcessed(trackingKey: string) {
    this.processedIds.add(trackingKey);
    console.log(`✅ [REALTIME SYNC] ID marqué comme traité: ${trackingKey}`);
  }

  /**
   * Démarre la synchronisation temps réel pour un utilisateur
   */
  async start() {
    try {
      console.log('🔄 [REALTIME SYNC] Démarrage de la synchronisation temps réel...');
      
      // Vérifier l'utilisateur
      const user = await getCurrentUser();
      if (!user) {
        console.log('⚠️ [REALTIME SYNC] Aucun utilisateur connecté');
        return;
      }

      // Nettoyer les listeners existants
      this.stop();

      // Démarrer les listeners pour chaque collection
      this.startProductsListener(user.uid);
      this.startStockListener(user.uid);
      this.startCategoriesListener(user.uid);
      this.startSalesListener(user.uid);
      this.startCustomersListener(user.uid);

      this.isActive = true;
      console.log('✅ [REALTIME SYNC] Synchronisation temps réel active');
    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur démarrage:', error);
    }
  }

  /**
   * Arrête tous les listeners
   */
  stop() {
    console.log('🛑 [REALTIME SYNC] Arrêt de la synchronisation temps réel...');
    
    this.listeners.forEach((unsubscribe, collection) => {
      unsubscribe();
      console.log(`🔌 [REALTIME SYNC] Listener ${collection} déconnecté`);
    });
    
    this.listeners.clear();
    this.isActive = false;
    console.log('✅ [REALTIME SYNC] Tous les listeners arrêtés');
  }

  /**
   * Listener pour les produits
   */
  private startProductsListener(userId: string) {
    try {
      const q = query(
        collection(db, 'products'),
        where('created_by', '==', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`🔄 [REALTIME SYNC] Changement détecté dans products (${snapshot.size} documents)`);
        
        // Utiliser docChanges() pour les changements incrémentiels
        const changes = snapshot.docChanges();
        
        if (changes.length === 0) {
          console.log('📭 [REALTIME SYNC] Aucun changement dans products');
          return;
        }

        console.log(`🔄 [REALTIME SYNC] ${changes.length} changement(s) dans products`);
        
        for (const change of changes) {
          const docData = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === 'added') {
            console.log(`➕ [REALTIME SYNC] Produit ajouté: ${docData.id} (${(docData as any).name})`);
            await this.handleAddOrUpdate('products', docData, 'added');
            // Filet de sécurité: créer un stock initial si nécessaire et encore absent
            await this.ensureInitialStockForProduct(userId, docData);
          } else if (change.type === 'modified') {
            console.log(`📝 [REALTIME SYNC] Produit modifié: ${docData.id} (${(docData as any).name})`);
            await this.handleAddOrUpdate('products', docData, 'modified');
            // Si le produit vient d'être normalisé (remplacement ID), s'assurer du stock
            await this.ensureInitialStockForProduct(userId, docData);
          } else if (change.type === 'removed') {
            console.log(`🗑️ [REALTIME SYNC] Produit supprimé: ${docData.id} (${(docData as any).name})`);
            await this.handleDelete('products', docData.id);
          }
        }

        // Recharger l'UI après les changements
        await this.triggerUIUpdate('products');
      }, (error) => {
        console.log('❌ [REALTIME SYNC] Erreur listener products:', error.message);
      });

      this.listeners.set('products', unsubscribe);
      console.log('✅ [REALTIME SYNC] Listener products activé');
    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur products listener:', error);
    }
  }

  /**
   * Listener pour le stock
   */
  private startStockListener(userId: string) {
    try {
      const q = query(
        collection(db, 'stock'),
        where('created_by', '==', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`🔄 [REALTIME SYNC] Changement détecté dans stock (${snapshot.size} documents)`);
        
        const changes = snapshot.docChanges();
        
        if (changes.length === 0) {
          console.log('📭 [REALTIME SYNC] Aucun changement dans stock');
          return;
        }

        console.log(`🔄 [REALTIME SYNC] ${changes.length} changement(s) dans stock`);
        
        for (const change of changes) {
          const docData = { id: change.doc.id, ...change.doc.data() };
          
          // Vérifier si la modification vient de nous-même (éviter les boucles)
          if (change.type === 'modified') {
            const localData = await databaseService.getAll('stock');
            const existingItem = localData.find((item: any) => item.id === docData.id);
            
            // Si l'élément local est plus récent, ignorer la modification Firebase
            if (existingItem) {
              const localUpdated = new Date(existingItem.updated_at).getTime();
              const firebaseUpdated = docData.updated_at?.seconds 
                ? docData.updated_at.seconds * 1000 
                : new Date(docData.updated_at).getTime();
              
              console.log(`🔍 [REALTIME SYNC] Comparaison stock ${docData.id}: local qty=${existingItem.quantity_current}, firebase qty=${docData.quantity_current}`);
              console.log(`🔍 [REALTIME SYNC] Timestamps: local=${localUpdated}, firebase=${firebaseUpdated}`);
              
              // Comparer les quantités pour détecter si c'est une régression
              const qtyChanged = existingItem.quantity_current !== docData.quantity_current;
              const isRegression = localUpdated > firebaseUpdated && qtyChanged && existingItem.quantity_current > docData.quantity_current;
              
              if (isRegression) {
                console.log(`⏭️ [REALTIME SYNC] Ignoré modification stock ${docData.id} car locale plus récente (qty: ${existingItem.quantity_current} > ${docData.quantity_current})`);
                continue;
              }
            }
          }
          
          if (change.type === 'added') {
            console.log(`➕ [REALTIME SYNC] Stock ajouté: ${docData.id}`);
            await this.handleAddOrUpdate('stock', docData, 'added');
          } else if (change.type === 'modified') {
            console.log(`📝 [REALTIME SYNC] Stock modifié: ${docData.id}`);
            await this.handleAddOrUpdate('stock', docData, 'modified');
          } else if (change.type === 'removed') {
            console.log(`🗑️ [REALTIME SYNC] Stock supprimé: ${docData.id}`);
            await this.handleDelete('stock', docData.id);
          }
        }

        // Recharger l'UI après les changements
        await this.triggerUIUpdate('stock');
      }, (error) => {
        console.log('❌ [REALTIME SYNC] Erreur listener stock:', error.message);
      });

      this.listeners.set('stock', unsubscribe);
      console.log('✅ [REALTIME SYNC] Listener stock activé');
    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur stock listener:', error);
    }
  }

  /**
   * Listener pour les catégories
   */
  private startCategoriesListener(userId: string) {
    try {
      const q = query(
        collection(db, 'categories'),
        where('created_by', '==', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`🔄 [REALTIME SYNC] Changement détecté dans categories (${snapshot.size} documents)`);
        
        const changes = snapshot.docChanges();
        
        if (changes.length === 0) {
          console.log('📭 [REALTIME SYNC] Aucun changement dans categories');
          return;
        }

        console.log(`🔄 [REALTIME SYNC] ${changes.length} changement(s) dans categories`);
        
        for (const change of changes) {
          const docData = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === 'added') {
            console.log(`➕ [REALTIME SYNC] Catégorie ajoutée: ${docData.id} (${(docData as any).name})`);
            await this.handleAddOrUpdate('categories', docData, 'added');
          } else if (change.type === 'modified') {
            console.log(`📝 [REALTIME SYNC] Catégorie modifiée: ${docData.id} (${(docData as any).name})`);
            await this.handleAddOrUpdate('categories', docData, 'modified');
          } else if (change.type === 'removed') {
            console.log(`🗑️ [REALTIME SYNC] Catégorie supprimée: ${docData.id} (${(docData as any).name})`);
            await this.handleDelete('categories', docData.id);
          }
        }

        // Recharger l'UI après les changements
        await this.triggerUIUpdate('categories');
      }, (error) => {
        console.log('❌ [REALTIME SYNC] Erreur listener categories:', error.message);
      });

      this.listeners.set('categories', unsubscribe);
      console.log('✅ [REALTIME SYNC] Listener categories activé');
    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur categories listener:', error);
    }
  }

  /**
   * Listener pour les ventes
   */
  private startSalesListener(userId: string) {
    try {
      const q = query(
        collection(db, 'sales'),
        where('user_id', '==', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`🔄 [REALTIME SYNC] Changement détecté dans sales (${snapshot.size} documents)`);
        
        const changes = snapshot.docChanges();
        
        if (changes.length === 0) {
          console.log('📭 [REALTIME SYNC] Aucun changement dans sales');
          return;
        }

        console.log(`🔄 [REALTIME SYNC] ${changes.length} changement(s) dans sales`);
        
        for (const change of changes) {
          const docData = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === 'added') {
            console.log(`➕ [REALTIME SYNC] Vente ajoutée: ${docData.id}`);
            await this.handleAddOrUpdate('sales', docData, 'added');
          } else if (change.type === 'modified') {
            console.log(`📝 [REALTIME SYNC] Vente modifiée: ${docData.id}`);
            await this.handleAddOrUpdate('sales', docData, 'modified');
          } else if (change.type === 'removed') {
            console.log(`🗑️ [REALTIME SYNC] Vente supprimée: ${docData.id}`);
            await this.handleDelete('sales', docData.id);
          }
        }

        // Recharger l'UI après les changements
        await this.triggerUIUpdate('sales');
      }, (error) => {
        console.log('❌ [REALTIME SYNC] Erreur listener sales:', error.message);
      });

      this.listeners.set('sales', unsubscribe);
      console.log('✅ [REALTIME SYNC] Listener sales activé');
    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur sales listener:', error);
    }
  }

  /**
   * Listener pour les clients
   */
  private startCustomersListener(userId: string) {
    try {
      const q = query(
        collection(db, 'customers'),
        where('created_by', '==', userId)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`🔄 [REALTIME SYNC] Changement détecté dans customers (${snapshot.size} documents)`);
        
        const changes = snapshot.docChanges();
        
        if (changes.length === 0) {
          console.log('📭 [REALTIME SYNC] Aucun changement dans customers');
          return;
        }

        console.log(`🔄 [REALTIME SYNC] ${changes.length} changement(s) dans customers`);
        
        for (const change of changes) {
          const docData = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === 'added') {
            console.log(`➕ [REALTIME SYNC] Client ajouté: ${docData.id}`);
            await this.handleAddOrUpdate('customers', docData, 'added');
          } else if (change.type === 'modified') {
            console.log(`📝 [REALTIME SYNC] Client modifié: ${docData.id}`);
            await this.handleAddOrUpdate('customers', docData, 'modified');
          } else if (change.type === 'removed') {
            console.log(`🗑️ [REALTIME SYNC] Client supprimé: ${docData.id}`);
            await this.handleDelete('customers', docData.id);
          }
        }

        // Recharger l'UI après les changements
        await this.triggerUIUpdate('customers');
      }, (error) => {
        console.log('❌ [REALTIME SYNC] Erreur listener customers:', error.message);
      });

      this.listeners.set('customers', unsubscribe);
      console.log('✅ [REALTIME SYNC] Listener customers activé');
    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur customers listener:', error);
    }
  }

  /**
   * Gère l'ajout ou la mise à jour d'un document
   */
  private async handleAddOrUpdate(tableName: string, docData: any, changeType: 'added' | 'modified') {
    try {
      const trackingKey = `${tableName}:${docData.id}`;
      
      // Si c'est un événement 'added' et qu'on l'a déjà traité, ignorer
      if (changeType === 'added' && this.processedIds.has(trackingKey)) {
        console.log(`⏭️ [REALTIME SYNC] ID déjà traité, ignoré: ${docData.id}`);
        return;
      }

      // Vérifier si l'élément existe déjà localement
      const localData = await databaseService.getAll(tableName);
      
      // Chercher un doublon par ID exact ou par firebase_id
      const existingItemById = localData.find((item: any) => 
        item.id === docData.id || item.firebase_id === docData.id
      );
      
      // Si l'élément existe déjà avec cet ID Firebase, mettre à jour si nécessaire mais ne pas créer de doublon
      if (existingItemById && existingItemById.firebase_id === docData.id) {
        console.log(`⏭️ [REALTIME SYNC] Client existe déjà avec firebase_id ${docData.id}, mise à jour si nécessaire`);
        
        // Mettre à jour l'élément existant avec les dernières données Firebase
        await databaseService.update(tableName, existingItemById.id, {
          ...docData,
          id: existingItemById.id, // Conserver l'ID local
          firebase_id: docData.id, // Conserver le firebase_id
          sync_status: 'synced'
        });
        
        this.processedIds.add(trackingKey);
        return;
      }
      
      // Aussi vérifier si un élément local existe avec le même ID que docData.id (cas où Firebase ID = Local ID)
      if (existingItemById && existingItemById.id === docData.id) {
        console.log(`⏭️ [REALTIME SYNC] Client existe déjà avec ID ${docData.id}, mise à jour`);
        
        await databaseService.update(tableName, docData.id, {
          ...docData,
          sync_status: 'synced'
        });
        
        this.processedIds.add(trackingKey);
        return;
      }

      // Vérifier si c'est un doublon basé sur le contenu (même nom, même created_by, timestamps proches)
      let duplicateItem: any = null;
      
      if (!existingItemById && (tableName === 'categories' || tableName === 'products' || tableName === 'customers')) {
        duplicateItem = localData.find((item: any) => {
          if (item.id === docData.id || item.firebase_id === docData.id) return false; // Pas un doublon si même ID ou firebase_id
          
          // Vérifier le nom et created_by
          if (item.name && docData.name) {
            const sameCreator = item.created_by === docData.created_by;
            const sameName = item.name === docData.name;
            
            // Vérifier si créés dans les 30 dernières secondes (augmenté pour plus de robustesse)
            const itemTime = new Date(item.created_at).getTime();
            const docTime = docData.created_at?.seconds 
              ? docData.created_at.seconds * 1000 
              : new Date(docData.created_at).getTime();
            const timeDiff = Math.abs(itemTime - docTime);
            const createdRecently = timeDiff < 30000; // 30 secondes
            
            // Vérifier aussi si l'ID local commence par "id-" (ID temporaire)
            const isLocalTempId = item.id.startsWith('id-');
            
            // Vérifier aussi si l'élément local a déjà un firebase_id (déjà synchronisé)
            const alreadyHasFirebaseId = item.firebase_id && item.firebase_id !== docData.id;
            
            if (sameCreator && sameName && (createdRecently || isLocalTempId) && !alreadyHasFirebaseId) {
              console.log(`🔍 [REALTIME SYNC] Doublon détecté dans ${tableName}:`);
              console.log(`   Local: ${item.id} (${item.name})`);
              console.log(`   Firebase: ${docData.id} (${docData.name})`);
              console.log(`   Différence de temps: ${timeDiff}ms`);
              console.log(`   ID local temporaire: ${isLocalTempId}`);
              return true;
            }
          }
          
          return false;
        });
      }

      if (duplicateItem && duplicateItem.id) {
        // C'est un doublon : mettre à jour l'item local avec l'ID Firebase au lieu de le supprimer/recréer
        console.log(`🔄 [REALTIME SYNC] Mise à jour du doublon local avec l'ID Firebase...`);
        
        // Mettre à jour l'item existant avec les données Firebase, en conservant l'ID local mais ajoutant le firebase_id
        await databaseService.update(tableName, duplicateItem.id, {
          ...docData,
          id: duplicateItem.id, // Conserver l'ID local
          firebase_id: docData.id, // Ajouter l'ID Firebase comme référence
          sync_status: 'synced'
        });
        console.log(`✅ [REALTIME SYNC] Doublon mis à jour: ${duplicateItem.id} (firebase_id: ${docData.id})`);
        
        // Marquer comme traité
        this.processedIds.add(trackingKey);
        
        // Nettoyer les anciens IDs (garder seulement les 100 derniers)
        if (this.processedIds.size > 100) {
          const idsArray = Array.from(this.processedIds);
          this.processedIds = new Set(idsArray.slice(-100));
        }
      } else if (existingItemById) {
        // Mise à jour normale - utiliser l'ID local si l'élément existe avec firebase_id
        const updateId = existingItemById.id === docData.id ? docData.id : existingItemById.id;
        
        await databaseService.update(tableName, updateId, {
          ...docData,
          id: updateId, // Conserver l'ID local
          firebase_id: docData.id, // Conserver le firebase_id
          sync_status: 'synced'
        });
        console.log(`✅ [REALTIME SYNC] Mis à jour dans ${tableName}: ${updateId} (firebase_id: ${docData.id})`);
      } else {
        // Insertion nouvelle (pas de doublon détecté)
        await databaseService.insert(tableName, {
          ...docData,
          sync_status: 'synced'
        });
        console.log(`✅ [REALTIME SYNC] Ajouté dans ${tableName}: ${docData.id}`);
        
        // Marquer comme traité
        this.processedIds.add(trackingKey);
        
        // Nettoyer les anciens IDs
        if (this.processedIds.size > 100) {
          const idsArray = Array.from(this.processedIds);
          this.processedIds = new Set(idsArray.slice(-100));
        }
      }

      // Invalider le cache
      databaseService.invalidateCache(tableName);
    } catch (error) {
      console.log(`❌ [REALTIME SYNC] Erreur handleAddOrUpdate ${tableName}:`, error);
    }
  }

  /**
   * Filet de sécurité: si un produit possède stock_quantity et qu'aucun stock
   * n'existe encore pour ce produit dans Firestore, créer un stock initial.
   * Idempotent via vérification préalable (requête Firestore).
   */
  private async ensureInitialStockForProduct(userId: string, productData: any) {
    try {
      const desiredQty = (productData as any)?.stock_quantity;
      if (desiredQty === undefined || desiredQty === null) {
        return; // rien à faire
      }

      // Vérifier s'il existe déjà un stock pour ce produit (côté Firestore)
      const stockQuery = query(
        collection(db, 'stock'),
        where('created_by', '==', userId),
        where('product_id', '==', productData.id)
      );
      const snapshot = await getDocs(stockQuery);
      if (!snapshot.empty) {
        // Un stock existe déjà, ne rien faire
        return;
      }

      // Créer le stock initial via FirebaseService pour rester cohérent
      const { firebaseService } = await import('./FirebaseService');
      const createdBy = (productData as any)?.created_by;
      const createdByName = (productData as any)?.created_by_name;

      await firebaseService.createStock({
        product_id: productData.id,
        location_id: 'default',
        quantity_current: Number(desiredQty) || 0,
        quantity_min: 0,
        quantity_max: 1000,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'initial',
        sync_status: 'synced',
        created_by: createdBy || userId,
        created_by_name: createdByName || '',
      } as any);

      console.log(`✅ [REALTIME SYNC] Stock initial créé pour le produit ${productData.id}`);

    } catch (error) {
      console.log('❌ [REALTIME SYNC] Erreur ensureInitialStockForProduct:', error);
    }
  }

  /**
   * Gère la suppression d'un document
   */
  private async handleDelete(tableName: string, docId: string) {
    try {
      await databaseService.delete(tableName, docId);
      console.log(`✅ [REALTIME SYNC] Supprimé de ${tableName}: ${docId}`);

      // Invalider le cache
      databaseService.invalidateCache(tableName);
    } catch (error) {
      console.log(`❌ [REALTIME SYNC] Erreur handleDelete ${tableName}:`, error);
    }
  }

  /**
   * Déclenche la mise à jour de l'UI pour une collection donnée
   */
  private async triggerUIUpdate(tableName: string) {
    try {
      console.log(`🔄 [REALTIME SYNC] Mise à jour UI pour ${tableName}...`);

      const { store } = await import('../store/index');

      switch (tableName) {
        case 'products':
          const { fetchProducts } = await import('../store/slices/productSlice');
          store.dispatch(fetchProducts());
          console.log('✅ [REALTIME SYNC] UI produits mise à jour');
          break;

        case 'categories':
          const { fetchCategories } = await import('../store/slices/categorySlice');
          store.dispatch(fetchCategories());
          console.log('✅ [REALTIME SYNC] UI catégories mise à jour');
          break;

        case 'stock':
          // Le stock est rechargé automatiquement via fetchProducts
          const { fetchProducts: fetchProductsForStock } = await import('../store/slices/productSlice');
          store.dispatch(fetchProductsForStock());
          console.log('✅ [REALTIME SYNC] UI stock mise à jour');
          break;

        case 'sales':
          // Les ventes peuvent être rechargées si nécessaire
          console.log('✅ [REALTIME SYNC] UI ventes mise à jour');
          break;

        case 'customers':
          // Les clients peuvent être rechargés si nécessaire
          console.log('✅ [REALTIME SYNC] UI clients mise à jour');
          break;

        default:
          console.log(`⚠️ [REALTIME SYNC] Pas de mise à jour UI définie pour ${tableName}`);
      }
    } catch (error) {
      console.log(`❌ [REALTIME SYNC] Erreur triggerUIUpdate ${tableName}:`, error);
    }
  }

  /**
   * Vérifie si la synchronisation est active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Obtient le nombre de listeners actifs
   */
  getActiveListenersCount(): number {
    return this.listeners.size;
  }
}

// Export singleton
export const realtimeSyncService = new RealtimeSyncService();

