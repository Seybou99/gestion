import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import { fetchCategories } from '../store/slices/categorySlice';
import {
    addSyncError,
    setLastSync,
    setPendingOperations,
    setSyncInProgress
} from '../store/slices/syncSlice';
import { getFirebaseId, isValidFirebaseId } from '../utils/firebaseIdMapper';
import { syncCategoriesToLocal } from '../utils/syncFirebaseToLocal';
import { databaseService, SyncOperation } from './DatabaseService';
import { firebaseService } from './FirebaseService';

interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
}

class SyncService {
  private config: SyncConfig = {
    maxRetries: 3,
    retryDelay: 5000, // 5 secondes
    batchSize: 10,
    syncInterval: 5 * 60 * 1000, // 5 minutes
  };

  private syncInProgress = false;
  private syncInterval: any = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  // Initialiser le service de synchronisation
  async init() {
    if (this.isInitialized) return;

    try {
      // Écouter les changements de réseau
      this.setupNetworkListener();
      
      // Démarrer la synchronisation périodique
      this.startPeriodicSync();
      
      this.isInitialized = true;
      console.log('🔄 Service de synchronisation initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation service de sync:', error);
    }
  }

  // Écouter les changements de connectivité
  private setupNetworkListener() {
    // Pour React Native, on écoute directement les changements du store Redux
    // au lieu des événements DOM
    console.log('🔄 Écoute des changements réseau configurée');
  }

  // Démarrer la synchronisation périodique
  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      const state = store.getState();
      const networkState = state.network as any;
      if (networkState.isConnected && !this.syncInProgress) {
        this.startSync();
      }
    }, this.config.syncInterval);
  }

  // Démarrer la synchronisation
  async startSync() {
    if (this.syncInProgress) {
      console.log('🔄 Synchronisation déjà en cours');
      return;
    }

    const state = store.getState();
    const networkState = state.network as any;
    if (!networkState.isConnected) {
      console.log('🌐 Pas de connexion - Synchronisation reportée');
      return;
    }

    this.syncInProgress = true;
    store.dispatch(setSyncInProgress(true));

    // console.log('🔄 Démarrage de la synchronisation...');
    
    // Réinitialiser les opérations en erreur au début de chaque synchronisation
    await this.resetErrorOperations();

    try {
      // 1. Récupérer les données du serveur
      await this.pullFromServer();
      
      // 2. Envoyer les modifications locales
      await this.pushToServer();
      
      // 3. Mettre à jour le timestamp de dernière sync
      await databaseService.updateLastSyncTimestamp();
      store.dispatch(setLastSync(new Date().toISOString()));
      
      // console.log('✅ Synchronisation terminée avec succès');
    } catch (error) {
      // console.error('❌ Erreur de synchronisation:', error);
      store.dispatch(addSyncError(error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      this.syncInProgress = false;
      store.dispatch(setSyncInProgress(false));
    }
  }

  // Télécharger depuis le serveur
  private async pullFromServer() {
    try {
      const lastSync = await databaseService.getLastSyncTimestamp();
      
      // console.log('📥 Récupération des mises à jour depuis Firebase...');
      
      // Vérifier que firebaseService est disponible
      if (!firebaseService) {
        console.log('⚠️ FirebaseService non disponible, synchronisation ignorée');
        return;
      }
      
      // 1. SYNCHRONISER LES CATÉGORIES EN PREMIER (automatique)
      // Vérifier si l'utilisateur est connecté (mode production)
      const state = store.getState() as any;
      const user = state.auth?.user;
      
      if (user) {
        try {
          await syncCategoriesToLocal();
          console.log('✅ [AUTO SYNC] Catégories synchronisées automatiquement');
          
          // Rafraîchir le store Redux des catégories après la synchronisation
          store.dispatch(fetchCategories());
        } catch (error) {
          console.error('❌ [AUTO SYNC] Erreur synchronisation automatique des catégories:', error);
          // Continuer même si la synchro des catégories échoue
        }
      } else {
        console.log('👤 [AUTO SYNC] Utilisateur non connecté, synchronisation des catégories ignorée (mode production)');
      }
      
      // 2. Récupérer les mises à jour depuis Firebase (seulement si utilisateur connecté)
      if (user) {
        const updates = await firebaseService.getUpdatesSince(lastSync);

        // Appliquer les mises à jour
        for (const update of updates) {
          await this.applyServerUpdate(update);
        }
      } else {
        console.log('👤 [AUTO SYNC] Utilisateur non connecté, récupération des mises à jour ignorée (mode production)');
      }

      // console.log(`📥 ${updates.length} mises à jour reçues de Firebase`);
    } catch (error) {
      // console.error('❌ Erreur pull:', error);
      throw error;
    }
  }

  // Envoyer vers le serveur
  private async pushToServer() {
    try {
      const pendingOperations = await databaseService.getPendingSyncOperations();
      store.dispatch(setPendingOperations(pendingOperations.length));
      
      if (pendingOperations.length === 0) {
        // console.log('📤 Aucune opération en attente');
        return;
      }

      // console.log(`📤 ${pendingOperations.length} opérations en attente`);

      // Trier par priorité (1 = haute, 3 = basse)
      pendingOperations.sort((a, b) => a.priority - b.priority);

      // Traiter par batches
      const batches = this.createBatches(pendingOperations, this.config.batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // console.log('📤 Toutes les opérations ont été envoyées');
    } catch (error) {
      // console.error('❌ Erreur push:', error);
      throw error;
    }
  }

  // Créer des batches d'opérations
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Traiter un batch d'opérations
  private async processBatch(batch: SyncOperation[]) {
    for (const operation of batch) {
      try {
        await this.markOperationAsSyncing(operation.id);
        await this.sendOperationToServer(operation);
        await this.markOperationAsSynced(operation.id);
        
        // Mettre à jour le store Redux
        this.updateStoreAfterSync(operation);
      } catch (error) {
        await this.handleSyncError(operation, error);
      }
    }
  }

  // Marquer une opération comme en cours de synchronisation
  private async markOperationAsSyncing(operationId: string) {
    await databaseService.update('sync_queue', operationId, {
      status: 'syncing',
    });
  }

  // Marquer une opération comme synchronisée
  private async markOperationAsSynced(operationId: string) {
    await databaseService.delete('sync_queue', operationId);
  }

  // Envoyer une opération au serveur
  private async sendOperationToServer(operation: SyncOperation) {
    const { table_name, record_id, operation: op, data } = operation;
    const parsedData = data ? JSON.parse(data) : null;

    // Vérifier que firebaseService est disponible
    if (!firebaseService) {
      console.log('⚠️ FirebaseService non disponible, opération ignorée');
      return;
    }
    
    console.log('🔍 [SYNC DEBUG] FirebaseService disponible:', !!firebaseService);
    console.log('🔍 [SYNC DEBUG] Méthode createProduct disponible:', typeof firebaseService.createProduct);

    try {
      console.log(`📤 Envoi ${op} pour ${table_name}:${record_id}`);
      
      // Traiter selon le type d'opération
      switch (op) {
        case 'create':
          console.log(`🔍 [SYNC DEBUG] Opération CREATE pour ${table_name}`);
          if (table_name === 'products') {
            console.log(`🔍 [SYNC DEBUG] Création produit avec données:`, parsedData);
            const firebaseId = await firebaseService.createProduct(parsedData);
            console.log(`✅ Produit créé dans Firebase: ${firebaseId}`);
            // Mettre à jour le statut local
            await databaseService.update('products', record_id, { 
              sync_status: 'synced',
              firebase_id: firebaseId 
            });
            console.log(`✅ Statut local mis à jour pour ${record_id}`);
          } else if (table_name === 'categories') {
            console.log(`🔍 [SYNC DEBUG] Création catégorie avec données:`, parsedData);
            const firebaseId = await firebaseService.createCategory(parsedData);
            console.log(`✅ Catégorie créée dans Firebase: ${firebaseId}`);
            // Mettre à jour le statut local
            await databaseService.update('categories', record_id, { 
              sync_status: 'synced',
              firebase_id: firebaseId 
            });
            console.log(`✅ Statut local mis à jour pour ${record_id}`);
          } else if (table_name === 'stock') {
            console.log(`🔍 [SYNC DEBUG] Création stock avec données:`, parsedData);
            const firebaseId = await firebaseService.createStock(parsedData);
            console.log(`✅ Stock créé dans Firebase: ${firebaseId}`);
            
            // IMPORTANT: Remplacer l'ID local par l'ID Firebase pour cohérence
            // 1. Récupérer les données complètes du stock local
            const localStock = await databaseService.getById('stock', record_id);
            
            // 2. Supprimer l'ancien stock avec l'ID local
            await databaseService.delete('stock', record_id);
            console.log(`🗑️ [ID SYNC] Ancien stock local supprimé: ${record_id}`);
            
            // 3. Créer un nouveau stock avec l'ID Firebase
            const existing = await AsyncStorage.getItem('stock');
            const items = existing ? JSON.parse(existing) : [];
            items.push({
              ...localStock,
              id: firebaseId, // ID Firebase comme ID local
              firebase_id: firebaseId,
              sync_status: 'synced'
            });
            await AsyncStorage.setItem('stock', JSON.stringify(items));
            
            // 4. Invalider le cache
            databaseService.invalidateCache('stock');
            
            console.log(`✅ [ID SYNC] Stock recréé avec ID Firebase: ${firebaseId}`);
          } else if (table_name === 'sales') {
            console.log(`🔍 [SYNC DEBUG] Création vente avec données:`, parsedData);
            const firebaseId = await firebaseService.createSale(parsedData);
            console.log(`✅ Vente créée dans Firebase: ${firebaseId}`);
            // Mettre à jour le statut local
            await databaseService.update('sales', record_id, { 
              sync_status: 'synced',
              firebase_id: firebaseId 
            });
            console.log(`✅ Statut local mis à jour pour ${record_id}`);
          } else if (table_name === 'customers') {
            console.log(`🔍 [SYNC DEBUG] Création client avec données:`, parsedData);
            const firebaseId = await firebaseService.createCustomer(parsedData);
            console.log(`✅ Client créé dans Firebase: ${firebaseId}`);
            // Mettre à jour le statut local
            await databaseService.update('customers', record_id, { 
              sync_status: 'synced',
              firebase_id: firebaseId 
            });
            console.log(`✅ Statut local mis à jour pour ${record_id} avec firebase_id: ${firebaseId}`);
          } else if (table_name === 'locations') {
            console.log(`🔍 [SYNC DEBUG] Création emplacement avec données:`, parsedData);
            const firebaseId = await firebaseService.createLocation(parsedData);
            console.log(`✅ Emplacement créé dans Firebase: ${firebaseId}`);
            
            // IMPORTANT: Remplacer l'ID local par l'ID Firebase
            const localLocation = await databaseService.getById('locations', record_id);
            await databaseService.delete('locations', record_id);
            
            const existing = await AsyncStorage.getItem('locations');
            const items = existing ? JSON.parse(existing) : [];
            items.push({
              ...localLocation,
              id: firebaseId,
              firebase_id: firebaseId,
              sync_status: 'synced'
            });
            await AsyncStorage.setItem('locations', JSON.stringify(items));
            databaseService.invalidateCache('locations');
            
            console.log(`✅ [ID SYNC] Emplacement recréé avec ID Firebase: ${firebaseId}`);
          } else if (table_name === 'inventory') {
            console.log(`🔍 [SYNC DEBUG] Création inventaire avec données:`, parsedData);
            const firebaseId = await firebaseService.createInventory(parsedData);
            console.log(`✅ Inventaire créé dans Firebase: ${firebaseId}`);
            
            // IMPORTANT: Remplacer l'ID local par l'ID Firebase
            const localInventory = await databaseService.getById('inventory', record_id);
            await databaseService.delete('inventory', record_id);
            
            const existing = await AsyncStorage.getItem('inventory');
            const items = existing ? JSON.parse(existing) : [];
            items.push({
              ...localInventory,
              id: firebaseId,
              firebase_id: firebaseId,
              sync_status: 'synced'
            });
            await AsyncStorage.setItem('inventory', JSON.stringify(items));
            databaseService.invalidateCache('inventory');
            
            console.log(`✅ [ID SYNC] Inventaire recréé avec ID Firebase: ${firebaseId}`);
          } else {
            console.log(`⚠️ [SYNC DEBUG] Table non supportée pour CREATE: ${table_name}`);
          }
          break;
          
            case 'update':
              if (table_name === 'products') {
                // Utiliser l'utilitaire pour obtenir l'ID Firebase
                const firebaseId = await getFirebaseId(record_id);
                
                if (firebaseId) {
                  await firebaseService.updateProduct(firebaseId, parsedData);
                  console.log(`✅ Produit mis à jour dans Firebase: ${firebaseId}`);
                } else {
                  console.log(`⚠️ Pas de firebase_id trouvé pour ${record_id}, tentative avec ID local`);
                  await firebaseService.updateProduct(record_id, parsedData);
                  console.log(`✅ Produit mis à jour dans Firebase: ${record_id}`);
                }
                await databaseService.update('products', record_id, { sync_status: 'synced' });
              } else if (table_name === 'categories') {
                // Utiliser l'utilitaire pour obtenir l'ID Firebase
                const firebaseId = await getFirebaseId(record_id);
                
                if (firebaseId) {
                  await firebaseService.updateCategory(firebaseId, parsedData);
                  console.log(`✅ Catégorie mise à jour dans Firebase: ${firebaseId}`);
                } else {
                  console.log(`⚠️ Pas de firebase_id trouvé pour ${record_id}, tentative avec ID local`);
                  await firebaseService.updateCategory(record_id, parsedData);
                  console.log(`✅ Catégorie mise à jour dans Firebase: ${record_id}`);
                }
                await databaseService.update('categories', record_id, { sync_status: 'synced' });
            } else if (table_name === 'stock') {
              // Utiliser le système de mapping des IDs pour le stock
              console.log(`🔍 [STOCK UPDATE] Recherche Firebase ID pour stock local: ${record_id}`);
              
              try {
                // 1. Chercher le firebase_id du stock local
                const firebaseId = await getFirebaseId(record_id);
                
                if (firebaseId) {
                  // Stock existe déjà dans Firebase, le mettre à jour
                  console.log(`✅ [STOCK UPDATE] Stock trouvé dans Firebase avec ID: ${firebaseId}`);
                  await firebaseService.updateStock(firebaseId, parsedData);
                  console.log(`✅ Stock mis à jour dans Firebase: ${firebaseId}`);
                } else {
                  // Stock n'existe pas dans Firebase, le créer
                  console.log(`⚠️ [STOCK UPDATE] Stock non trouvé dans Firebase, création...`);
                  
                  // Vérifier si le produit parent existe dans Firebase
                  const productFirebaseId = await getFirebaseId(parsedData.product_id);
                  if (!productFirebaseId) {
                    throw new Error(`Produit parent ${parsedData.product_id} non trouvé dans Firebase`);
                  }
                  
                  // Créer le stock avec le bon product_id Firebase
                  const stockDataWithFirebaseProductId = {
                    ...parsedData,
                    product_id: productFirebaseId
                  };
                  
                  const newStockId = await firebaseService.createStock(stockDataWithFirebaseProductId);
                  console.log(`✅ Stock créé dans Firebase: ${newStockId}`);
                  
                  // Sauvegarder le firebase_id localement
                  await databaseService.update('stock', record_id, { 
                    sync_status: 'synced',
                    firebase_id: newStockId 
                  });
                }
                
                await databaseService.update('stock', record_id, { sync_status: 'synced' });
              } catch (error) {
                // Ne pas afficher d'erreur si c'est le mode offline (comportement normal)
                if (error instanceof Error && !error.message.includes('Mode offline')) {
                  console.error(`❌ [STOCK UPDATE] Erreur pour product_id ${parsedData.product_id}:`, error);
                  console.error(`❌ [STOCK UPDATE] Données reçues:`, parsedData);
                  
                  // Marquer l'opération comme erreur pour éviter les tentatives répétées
                  await databaseService.update('stock', record_id, { 
                    sync_status: 'error',
                    sync_error: error.message 
                  });
                }
                throw error;
              }
            } else if (table_name === 'locations') {
              const firebaseId = await getFirebaseId(record_id);
              
              if (firebaseId) {
                await firebaseService.updateLocation(firebaseId, parsedData);
                console.log(`✅ Emplacement mis à jour dans Firebase: ${firebaseId}`);
              } else {
                await firebaseService.updateLocation(record_id, parsedData);
                console.log(`✅ Emplacement mis à jour dans Firebase: ${record_id}`);
              }
              await databaseService.update('locations', record_id, { sync_status: 'synced' });
            } else if (table_name === 'inventory') {
              const firebaseId = await getFirebaseId(record_id);
              
              if (firebaseId) {
                await firebaseService.updateInventory(firebaseId, parsedData);
                console.log(`✅ Inventaire mis à jour dans Firebase: ${firebaseId}`);
              } else {
                await firebaseService.updateInventory(record_id, parsedData);
                console.log(`✅ Inventaire mis à jour dans Firebase: ${record_id}`);
              }
              await databaseService.update('inventory', record_id, { sync_status: 'synced' });
            }
              break;
          
        case 'delete':
          if (table_name === 'products') {
            // Pour la suppression, vérifier si l'ID est un ID Firebase ou local
            if (isValidFirebaseId(record_id)) {
              // C'est un ID Firebase, suppression directe
              await firebaseService.deleteProduct(record_id);
              console.log(`✅ Produit supprimé de Firebase: ${record_id}`);
            } else {
              // C'est un ID local, chercher l'ID Firebase correspondant
              const firebaseId = await getFirebaseId(record_id);
              if (firebaseId) {
                await firebaseService.deleteProduct(firebaseId);
                console.log(`✅ Produit supprimé de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, produit probablement créé en mode offline uniquement`);
              }
            }
          } else if (table_name === 'stock') {
            if (isValidFirebaseId(record_id)) {
              // C'est un ID Firebase, suppression directe
              await firebaseService.deleteStock(record_id);
              console.log(`✅ Stock supprimé de Firebase: ${record_id}`);
            } else {
              // C'est un ID local, chercher l'ID Firebase correspondant
              const firebaseId = await getFirebaseId(record_id);
              if (firebaseId) {
                await firebaseService.deleteStock(firebaseId);
                console.log(`✅ Stock supprimé de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, stock probablement créé en mode offline uniquement`);
              }
            }
          } else if (table_name === 'categories') {
            // Pour la suppression, vérifier si l'ID est un ID Firebase ou local
            if (isValidFirebaseId(record_id)) {
              // C'est un ID Firebase, suppression directe
              await firebaseService.deleteCategory(record_id);
              console.log(`✅ Catégorie supprimée de Firebase: ${record_id}`);
            } else {
              // C'est un ID local, chercher l'ID Firebase correspondant
              const firebaseId = await getFirebaseId(record_id);
              if (firebaseId) {
                await firebaseService.deleteCategory(firebaseId);
                console.log(`✅ Catégorie supprimée de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, catégorie probablement créée en mode offline uniquement`);
              }
            }
          } else if (table_name === 'stock') {
            // Pour la suppression, vérifier si l'ID est un ID Firebase ou local
            if (isValidFirebaseId(record_id)) {
              // C'est un ID Firebase, suppression directe
              await firebaseService.deleteStock(record_id);
              console.log(`✅ Stock supprimé de Firebase: ${record_id}`);
            } else {
              // C'est un ID local, chercher l'ID Firebase correspondant
              const firebaseId = await getFirebaseId(record_id);
              if (firebaseId) {
                await firebaseService.deleteStock(firebaseId);
                console.log(`✅ Stock supprimé de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, stock probablement créé en mode offline uniquement`);
              }
            }
          } else if (table_name === 'customers') {
            // Pour la suppression, vérifier si l'ID est un ID Firebase ou local
            if (isValidFirebaseId(record_id)) {
              // C'est un ID Firebase, suppression directe
              await firebaseService.deleteCustomer(record_id);
              console.log(`✅ Client supprimé de Firebase: ${record_id}`);
            } else {
              // C'est un ID local, chercher l'ID Firebase correspondant
              const firebaseId = await getFirebaseId(record_id);
              if (firebaseId) {
                await firebaseService.deleteCustomer(firebaseId);
                console.log(`✅ Client supprimé de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
                
                // Supprimer définitivement le client local après suppression réussie dans Firebase
                await databaseService.delete('customers', record_id);
                console.log(`🗑️ Client local supprimé définitivement: ${record_id}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, client probablement créé en mode offline uniquement`);
                
                // Supprimer le client local même s'il n'existe pas dans Firebase
                await databaseService.delete('customers', record_id);
                console.log(`🗑️ Client local supprimé (n'existait pas dans Firebase): ${record_id}`);
              }
            }
          } else if (table_name === 'locations') {
            if (isValidFirebaseId(record_id)) {
              await firebaseService.deleteLocation(record_id);
              console.log(`✅ Emplacement supprimé de Firebase: ${record_id}`);
            } else {
              // Pour les suppressions, utiliser le firebase_id des données si disponible
              let firebaseId = null;
              if (parsedData && parsedData.firebase_id) {
                firebaseId = parsedData.firebase_id;
                console.log(`🔍 [SYNC DEBUG] Utilisation firebase_id des données: ${firebaseId}`);
              } else {
                // Fallback: chercher l'ID Firebase (peut ne pas fonctionner si l'item a été supprimé localement)
                firebaseId = await getFirebaseId(record_id);
              }
              
              if (firebaseId) {
                await firebaseService.deleteLocation(firebaseId);
                console.log(`✅ Emplacement supprimé de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, emplacement probablement créé en mode offline uniquement`);
              }
            }
          } else if (table_name === 'inventory') {
            console.log(`🔍 [SYNC DEBUG] Traitement suppression inventaire: ${record_id}`);
            console.log(`🔍 [SYNC DEBUG] Données reçues:`, parsedData);
            
            if (isValidFirebaseId(record_id)) {
              console.log(`🔍 [SYNC DEBUG] ID Firebase détecté, suppression directe: ${record_id}`);
              await firebaseService.deleteInventory(record_id);
              console.log(`✅ Inventaire supprimé de Firebase: ${record_id}`);
            } else {
              // Pour les suppressions, utiliser le firebase_id des données si disponible
              let firebaseId = null;
              if (parsedData && parsedData.firebase_id) {
                firebaseId = parsedData.firebase_id;
                console.log(`🔍 [SYNC DEBUG] Utilisation firebase_id des données: ${firebaseId}`);
              } else {
                // Fallback: chercher l'ID Firebase (peut ne pas fonctionner si l'item a été supprimé localement)
                console.log(`🔍 [SYNC DEBUG] Recherche firebase_id pour ID local: ${record_id}`);
                firebaseId = await getFirebaseId(record_id);
                console.log(`🔍 [SYNC DEBUG] firebase_id trouvé: ${firebaseId}`);
              }
              
              if (firebaseId) {
                console.log(`🔍 [SYNC DEBUG] Tentative suppression Firebase avec ID: ${firebaseId}`);
                await firebaseService.deleteInventory(firebaseId);
                console.log(`✅ Inventaire supprimé de Firebase avec ID local: ${record_id} -> ${firebaseId}`);
              } else {
                console.log(`⚠️ Aucun ID Firebase trouvé pour ${record_id}, inventaire probablement créé en mode offline uniquement`);
              }
            }
          }
          break;
          
        default:
          console.log(`⚠️ Opération non supportée: ${op}`);
      }
      
    } catch (error) {
      // Masquer les erreurs de mode offline qui sont normales
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log(`📱 Mode offline - opération ${op} pour ${table_name}:${record_id} reportée (normal)`);
      } else {
        // console.error(`❌ Erreur envoi opération ${op} pour ${table_name}:${record_id}:`, error);
      }
      throw error; // Re-lancer pour que la gestion d'erreur parente fonctionne
    }
  }

  // Appliquer une mise à jour du serveur
  private async applyServerUpdate(update: any) {
    const { table, operation, data } = update;

    switch (operation) {
      case 'create':
      case 'update':
        await databaseService.update(table, data.id, {
          ...data,
          sync_status: 'synced',
          sync_timestamp: new Date().toISOString(),
        });
        break;
      case 'delete':
        await databaseService.delete(table, data.id);
        break;
    }
  }

  // Mettre à jour le store après synchronisation
  private updateStoreAfterSync(operation: SyncOperation) {
    const { table_name, record_id } = operation;
    
    // Cette méthode sera étendue pour mettre à jour les différents slices
    // selon le type d'opération et la table concernée
    console.log(`✅ Opération ${operation.operation} synchronisée pour ${table_name}:${record_id}`);
  }

  // Nettoyer les opérations en erreur (supprimer au lieu de réinitialiser)
  async cleanErrorOperations(): Promise<void> {
    try {
      console.log('🧹 [CLEANUP] Nettoyage des opérations en erreur...');
      
      // Récupérer toutes les opérations en erreur
      const errorOperations = await databaseService.query(
        'SELECT * FROM sync_queue WHERE status = ?',
        ['error']
      ) as SyncOperation[];
      
      if (errorOperations.length === 0) {
        console.log('✅ [CLEANUP] Aucune opération en erreur à nettoyer');
        return;
      }
      
      console.log(`🧹 [CLEANUP] ${errorOperations.length} opérations en erreur trouvées`);
      
      // Supprimer chaque opération en erreur
      for (const operation of errorOperations) {
        await databaseService.delete('sync_queue', operation.id);
        console.log(`🗑️ [CLEANUP] Opération ${operation.id} supprimée (${operation.table_name}:${operation.record_id})`);
      }
      
      console.log(`✅ [CLEANUP] ${errorOperations.length} opérations nettoyées avec succès`);
    } catch (error) {
      console.error('❌ [CLEANUP] Erreur lors du nettoyage des opérations:', error);
    }
  }

  // Réinitialiser les opérations en erreur lors du passage en mode online
  async resetErrorOperations(): Promise<void> {
    try {
      console.log('🔄 [ONLINE] Réinitialisation des opérations en erreur...');
      
      // Récupérer toutes les opérations en erreur
      const errorOperations = await databaseService.query(
        'SELECT * FROM sync_queue WHERE status = ?',
        ['error']
      ) as SyncOperation[];
      
      if (errorOperations.length === 0) {
        console.log('✅ [ONLINE] Aucune opération en erreur à réinitialiser');
        return;
      }
      
      console.log(`🔄 [ONLINE] ${errorOperations.length} opérations en erreur trouvées`);
      
      // Vérifier si l'opération est valide avant de la réinitialiser
      for (const operation of errorOperations) {
        try {
          // Vérifier si l'enregistrement existe encore localement
          const record = await databaseService.getById(operation.table_name, operation.record_id);
          
          if (!record) {
            // L'enregistrement n'existe plus, supprimer l'opération
            await databaseService.delete('sync_queue', operation.id);
            console.log(`🗑️ [ONLINE] Opération ${operation.id} supprimée (enregistrement introuvable)`);
            continue;
          }
          
          // L'enregistrement existe, réinitialiser l'opération
          await databaseService.update('sync_queue', operation.id, {
            status: 'pending',
            retry_count: 0,
            error_message: null,
          });
          console.log(`✅ [ONLINE] Opération ${operation.id} réinitialisée (${operation.table_name}:${operation.record_id})`);
        } catch (err) {
          // En cas d'erreur, supprimer l'opération
          await databaseService.delete('sync_queue', operation.id);
          console.log(`🗑️ [ONLINE] Opération ${operation.id} supprimée (erreur: ${err})`);
        }
      }
      
      console.log(`✅ [ONLINE] Opérations traitées avec succès`);
    } catch (error) {
      console.error('❌ [ONLINE] Erreur lors de la réinitialisation des opérations:', error);
    }
  }

  // Gérer les erreurs de synchronisation
  private async handleSyncError(operation: SyncOperation, error: any) {
    const newRetryCount = operation.retry_count + 1;
    
    // Masquer les erreurs de mode offline qui sont normales
    const isOfflineError = error instanceof Error && error.message.includes('Mode offline');
    
    // Vérifier si c'est une erreur de document introuvable
    const isNotFoundError = error instanceof Error && (
      error.message.includes('Item avec l\'id') ||
      error.message.includes('non trouvé') ||
      error.message.includes('Document stock introuvable')
    );
    
    // Vérifier si c'est une erreur de doublon
    const isDuplicateError = error instanceof Error && (
      error.message.includes('existe déjà dans Firebase') ||
      error.message.includes('SKU') && error.message.includes('existe déjà')
    );
    
    // Si le document n'existe pas, supprimer l'opération immédiatement
    if (isNotFoundError) {
      await databaseService.delete('sync_queue', operation.id);
      console.log(`🗑️ Opération ${operation.id} supprimée (document introuvable)`);
      return;
    }
    
    // Si c'est un doublon, supprimer l'opération et marquer comme synchronisé
    if (isDuplicateError) {
      await databaseService.delete('sync_queue', operation.id);
      console.log(`⚠️ Opération ${operation.id} supprimée (doublon détecté): ${error.message}`);
      
      // Marquer le produit local comme synchronisé
      if (operation.table_name === 'products') {
        await databaseService.update('products', operation.record_id, {
          sync_status: 'synced'
        });
        console.log(`✅ Produit ${operation.record_id} marqué comme synchronisé (doublon)`);
      }
      return;
    }
    
    if (newRetryCount >= this.config.maxRetries) {
      // Marquer comme erreur définitive
      await databaseService.update('sync_queue', operation.id, {
        status: 'error',
        retry_count: newRetryCount,
        error_message: error.message || 'Erreur inconnue',
      });
      
      if (isOfflineError) {
        console.log(`📱 Mode offline - erreur définitive pour l'opération ${operation.id} (normal)`);
      } else {
        console.error(`❌ Erreur définitive pour l'opération ${operation.id}:`, error);
      }
    } else {
      // Programmer un nouveau retry
      await databaseService.update('sync_queue', operation.id, {
        status: 'pending',
        retry_count: newRetryCount,
        error_message: error.message || 'Erreur inconnue',
      });
      
      if (isOfflineError) {
        console.log(`📱 Mode offline - retry ${newRetryCount}/${this.config.maxRetries} pour l'opération ${operation.id} (normal)`);
      } else {
        console.log(`⏳ Retry ${newRetryCount}/${this.config.maxRetries} pour l'opération ${operation.id}`);
      }
      
      // Programmer le retry avec délai
      setTimeout(() => {
        this.startSync();
      }, this.config.retryDelay);
    }
  }

  // Ajouter une opération à la queue de synchronisation
  async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    priority: number = 1
  ) {
    try {
      const syncRecord = {
        table_name: tableName,
        record_id: recordId,
        operation,
        data: JSON.stringify(data),
        priority,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      };

      await databaseService.insert('sync_queue', syncRecord);

      // Mettre à jour le compteur d'opérations en attente
      const pendingOps = await databaseService.getPendingSyncOperations();
      store.dispatch(setPendingOperations(pendingOps.length));

      console.log(`📝 Opération ${operation} ajoutée à la queue pour ${tableName}:${recordId}`);

      // Démarrer la synchronisation si en ligne
      const state = store.getState();
      const networkState = state.network as any;
      if (networkState.isConnected && !this.syncInProgress) {
        this.startSync();
      }
    } catch (error) {
      console.error('❌ Erreur ajout à la queue de sync:', error);
    }
  }

  // Obtenir le statut de synchronisation
  getSyncStatus() {
    const state = store.getState();
    const syncState = state.sync as any;
    const networkState = state.network as any;
    
    return {
      isOnline: networkState.isConnected,
      syncInProgress: syncState.syncInProgress,
      lastSync: syncState.lastSync,
      pendingOperations: syncState.pendingOperations,
      syncErrors: syncState.syncErrors,
    };
  }

  // Forcer une synchronisation immédiate
  async forceSync() {
    console.log('🔄 Synchronisation forcée');
    
    // Réinitialiser les opérations en erreur avant de synchroniser
    await this.resetErrorOperations();
    
    await this.startSync();
  }

  // Nettoyer les ressources
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isInitialized = false;
    console.log('🔄 Service de synchronisation détruit');
  }
}

// Instance singleton
export const syncService = new SyncService();
