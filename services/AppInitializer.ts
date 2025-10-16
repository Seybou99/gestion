import { store } from '../store';
import { setError, setLoading } from '../store/slices/authSlice';
import { syncCategoriesToLocal } from '../utils/syncFirebaseToLocal';
import { syncOfflineArticles } from '../utils/syncOfflineData';
import { databaseService } from './DatabaseService';
import { firebaseService } from './FirebaseService';
import { networkService } from './NetworkService';
import { syncService } from './SyncService';

interface InitializationConfig {
  seedTestData: boolean;
  skipDatabaseInit: boolean;
  skipNetworkInit: boolean;
  skipSyncInit: boolean;
}

class AppInitializer {
  private config: InitializationConfig = {
    seedTestData: __DEV__, // Générer des données de test en développement
    skipDatabaseInit: false,
    skipNetworkInit: false,
    skipSyncInit: false,
  };

  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config?: Partial<InitializationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Initialiser l'application
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ Application déjà initialisée');
      return;
    }

    if (this.initializationPromise) {
      console.log('⏳ Initialisation en cours...');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Démarrage de l\'initialisation de l\'application...');

    try {
      store.dispatch(setLoading(true));

      // 1. Initialiser Firebase
      if (!this.config.skipDatabaseInit) {
        console.log('🔥 Initialisation de Firebase...');
        await this.initializeFirebase();
      }

      // 2. Initialiser le service réseau
      if (!this.config.skipNetworkInit) {
        console.log('🌐 Initialisation du service réseau...');
        await this.initializeNetwork();
      }

      // 3. Initialiser le service de synchronisation
      if (!this.config.skipSyncInit) {
        console.log('🔄 Initialisation du service de synchronisation...');
        await this.initializeSync();
      }

      // 4. Générer des données de test si nécessaire
      if (this.config.seedTestData) {
        console.log('🌱 Génération des données de test...');
        await this.seedTestDataIfNeeded();
      }

      // 5. Synchroniser automatiquement les articles offline au démarrage
      await this.syncOfflineArticlesOnStartup();

      this.isInitialized = true;
      const duration = Date.now() - startTime;
      
      console.log(`✅ Application initialisée avec succès en ${duration}ms`);
      store.dispatch(setLoading(false));

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      store.dispatch(setError(error instanceof Error ? error.message : 'Erreur d\'initialisation'));
      store.dispatch(setLoading(false));
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  // Initialiser Firebase
  private async initializeFirebase(): Promise<void> {
    try {
      await firebaseService.init();
      console.log('✅ Firebase initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation Firebase:', error);
      throw new Error('Impossible d\'initialiser Firebase');
    }
  }

  // Initialiser le service réseau
  private async initializeNetwork(): Promise<void> {
    try {
      await networkService.init();
      console.log('✅ Service réseau initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation service réseau:', error);
      throw new Error('Impossible d\'initialiser le service réseau');
    }
  }

  // Initialiser le service de synchronisation
  private async initializeSync(): Promise<void> {
    try {
      await syncService.init();
      console.log('✅ Service de synchronisation initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation service de synchronisation:', error);
      throw new Error('Impossible d\'initialiser le service de synchronisation');
    }
  }

  // Générer des données de test si nécessaire
  private async seedTestDataIfNeeded(): Promise<void> {
    try {
      // DÉSACTIVÉ : Ne plus générer automatiquement de données de test
      console.log('📊 Génération automatique de données de test désactivée');
      console.log('📊 L\'application démarrera avec des données vides');
      
      // Code commenté pour référence
      /*
      const existingProducts = await databaseService.getAll('products');
      
      if (existingProducts.length === 0) {
        await seedTestData();
        console.log('✅ Données de test générées');
      } else {
        console.log('📊 Données existantes trouvées, pas de génération nécessaire');
      }
      */
    } catch (error) {
      console.error('❌ Erreur génération données de test:', error);
      // Ne pas faire échouer l'initialisation pour les données de test
    }
  }

  // Synchroniser automatiquement les articles offline au démarrage
  private async syncOfflineArticlesOnStartup(): Promise<void> {
    try {
      console.log('🔄 [STARTUP] Synchronisation automatique au démarrage...');
      
      // Vérifier si on est connecté
      const state = store.getState() as any;
      const isConnected = state.network?.isConnected;
      
      if (!isConnected) {
        console.log('📱 [STARTUP] Pas de connexion, synchronisation reportée');
        return;
      }

      // Vérifier si l'utilisateur est connecté (mode production)
      const user = state.auth?.user;
      if (!user) {
        console.log('👤 [STARTUP] Utilisateur non connecté, synchronisation reportée (mode production)');
        return;
      }

      // 1. Synchroniser les catégories depuis Firebase
      try {
        await syncCategoriesToLocal();
        console.log('✅ [STARTUP] Catégories synchronisées depuis Firebase');
      } catch (error) {
        console.error('❌ [STARTUP] Erreur synchronisation catégories:', error);
        // Continuer même si cela échoue
      }

      // 2. Synchroniser les articles offline
      await syncOfflineArticles();
      
      // 3. Déclencher une synchronisation immédiate si il y a des opérations en attente
      const pendingOps = await databaseService.getAll('sync_queue');
      if (pendingOps.length > 0) {
        console.log(`🔄 [STARTUP] ${pendingOps.length} opérations en attente, synchronisation immédiate...`);
        await syncService.forceSync();
      }
      
      console.log('✅ [STARTUP] Synchronisation automatique terminée');
    } catch (error) {
      console.error('❌ [STARTUP] Erreur synchronisation automatique:', error);
      // Ne pas faire échouer l'initialisation pour la synchronisation
    }
  }

  // Réinitialiser l'application
  async reset(): Promise<void> {
    console.log('🔄 Réinitialisation de l\'application...');
    
    try {
      // Nettoyer les services
      syncService.destroy();
      networkService.destroy();
      
      // Réinitialiser le store
      store.dispatch({ type: 'RESET' });
      
      this.isInitialized = false;
      this.initializationPromise = null;
      
      console.log('✅ Application réinitialisée');
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      throw error;
    }
  }

  // Obtenir le statut d'initialisation
  getInitializationStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.initializationPromise !== null,
      config: this.config,
    };
  }

  // Vérifier si l'application est prête
  isReady(): boolean {
    return this.isInitialized && !this.initializationPromise;
  }

  // Attendre que l'application soit initialisée
  async waitForInitialization(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      try {
        await Promise.race([
          this.initializationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }
}

// Instance singleton
export const appInitializer = new AppInitializer();

// Configuration par défaut pour différents environnements
export const createInitializer = (config?: Partial<InitializationConfig>) => {
  return new AppInitializer(config);
};

// Configuration pour les tests
export const createTestInitializer = () => {
  return new AppInitializer({
    seedTestData: false,
    skipDatabaseInit: false,
    skipNetworkInit: true,
    skipSyncInit: true,
  });
};

// Configuration pour le développement
export const createDevInitializer = () => {
  return new AppInitializer({
    seedTestData: true,
    skipDatabaseInit: false,
    skipNetworkInit: false,
    skipSyncInit: false,
  });
};

// Configuration pour la production
export const createProdInitializer = () => {
  return new AppInitializer({
    seedTestData: false,
    skipDatabaseInit: false,
    skipNetworkInit: false,
    skipSyncInit: false,
  });
};
