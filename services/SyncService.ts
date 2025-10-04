import { store } from '../store';
import {
  addSyncError,
  setLastSync,
  setPendingOperations,
  setSyncInProgress
} from '../store/slices/syncSlice';
import { getFirebaseId, isValidFirebaseId } from '../utils/firebaseIdMapper';
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

    console.log('🔄 Démarrage de la synchronisation...');

    try {
      // 1. Récupérer les données du serveur
      await this.pullFromServer();
      
      // 2. Envoyer les modifications locales
      await this.pushToServer();
      
      // 3. Mettre à jour le timestamp de dernière sync
      await databaseService.updateLastSyncTimestamp();
      store.dispatch(setLastSync(new Date().toISOString()));
      
      console.log('✅ Synchronisation terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur de synchronisation:', error);
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
      
      console.log('📥 Récupération des mises à jour depuis Firebase...');
      
      // Vérifier que firebaseService est disponible
      if (!firebaseService) {
        console.log('⚠️ FirebaseService non disponible, synchronisation ignorée');
        return;
      }
      
      // Récupérer les mises à jour depuis Firebase
      const updates = await firebaseService.getUpdatesSince(lastSync);

      // Appliquer les mises à jour
      for (const update of updates) {
        await this.applyServerUpdate(update);
      }

      console.log(`📥 ${updates.length} mises à jour reçues de Firebase`);
    } catch (error) {
      console.error('❌ Erreur pull:', error);
      throw error;
    }
  }

  // Envoyer vers le serveur
  private async pushToServer() {
    try {
      const pendingOperations = await databaseService.getPendingSyncOperations();
      store.dispatch(setPendingOperations(pendingOperations.length));
      
      if (pendingOperations.length === 0) {
        console.log('📤 Aucune opération en attente');
        return;
      }

      console.log(`📤 ${pendingOperations.length} opérations en attente`);

      // Trier par priorité (1 = haute, 3 = basse)
      pendingOperations.sort((a, b) => a.priority - b.priority);

      // Traiter par batches
      const batches = this.createBatches(pendingOperations, this.config.batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      console.log('📤 Toutes les opérations ont été envoyées');
    } catch (error) {
      console.error('❌ Erreur push:', error);
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
          }
          break;
          
        default:
          console.log(`⚠️ Opération non supportée: ${op}`);
      }
      
    } catch (error) {
      // Masquer les erreurs "Mode offline" qui sont normales
      if (error instanceof Error && error.message.includes('Mode offline')) {
        console.log(`📱 Mode offline - opération ${op} pour ${table_name}:${record_id} (normal)`);
      } else {
        console.error(`❌ Erreur envoi opération ${op} pour ${table_name}:${record_id}:`, error);
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

  // Gérer les erreurs de synchronisation
  private async handleSyncError(operation: SyncOperation, error: any) {
    const newRetryCount = operation.retry_count + 1;
    
    // Masquer les erreurs "Mode offline" qui sont normales
    const isOfflineError = error instanceof Error && error.message.includes('Mode offline');
    
    if (newRetryCount >= this.config.maxRetries) {
      // Marquer comme erreur définitive
      await databaseService.update('sync_queue', operation.id, {
        status: 'error',
        retry_count: newRetryCount,
        error_message: error.message || 'Erreur inconnue',
      });
      
      if (!isOfflineError) {
        console.error(`❌ Erreur définitive pour l'opération ${operation.id}:`, error);
      } else {
        console.log(`📱 Mode offline - erreur définitive pour l'opération ${operation.id} (normal)`);
      }
    } else {
      // Programmer un nouveau retry
      await databaseService.update('sync_queue', operation.id, {
        status: 'pending',
        retry_count: newRetryCount,
        error_message: error.message || 'Erreur inconnue',
      });
      
      if (!isOfflineError) {
        console.log(`⏳ Retry ${newRetryCount}/${this.config.maxRetries} pour l'opération ${operation.id}`);
      } else {
        console.log(`📱 Mode offline - retry ${newRetryCount}/${this.config.maxRetries} pour l'opération ${operation.id} (normal)`);
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
