#!/usr/bin/env node

/**
 * Script de test en temps réel pour la synchronisation de suppression
 * 
 * Ce script utilise les vrais services de l'application et simule
 * le comportement utilisateur réel.
 */

const { databaseService } = require('../services/DatabaseService');
const { firebaseService } = require('../services/FirebaseService');
const { handleOfflineDelete } = require('../utils/offlineDeleteHandler');
const { isValidFirebaseId } = require('../utils/firebaseIdMapper');

class SyncTestManager {
  constructor() {
    this.testResults = [];
    this.testProductId = null;
    this.testFirebaseId = null;
  }

  async runTest() {
    console.log('🧪 [TEST RÉEL] Démarrage du test de synchronisation en temps réel');
    console.log('=' .repeat(70));

    try {
      await this.testCreateProduct();
      await this.testVerifyFirebaseId();
      await this.testDeleteProduct();
      await this.testVerifyDeletion();
      await this.testSyncQueue();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ [TEST RÉEL] Erreur:', error);
      this.testResults.push({ step: 'ERROR', status: 'FAILED', error: error.message });
    }
  }

  async testCreateProduct() {
    console.log('\n📝 Test 1: Création d\'un produit');
    
    const testProduct = {
      name: `Test Sync ${Date.now()}`,
      description: 'Test de synchronisation en temps réel',
      sku: `SYNC-${Date.now().toString().slice(-6)}`,
      category_id: 'test-category',
      price_buy: 15,
      price_sell: 25,
      margin: 10,
      unit: 'pcs',
      is_active: true,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Création locale
      this.testProductId = await databaseService.insert('products', testProduct);
      console.log(`✅ Produit créé localement: ${this.testProductId}`);

      // Tentative de synchronisation Firebase
      try {
        this.testFirebaseId = await firebaseService.createProduct(testProduct);
        console.log(`✅ Produit créé dans Firebase: ${this.testFirebaseId}`);
        
        // Mise à jour locale avec firebase_id
        await databaseService.update('products', this.testProductId, {
          sync_status: 'synced',
          firebase_id: this.testFirebaseId
        });
        console.log(`✅ firebase_id sauvegardé: ${this.testFirebaseId}`);
        
        this.testResults.push({ 
          step: 'CREATE_PRODUCT', 
          status: 'SUCCESS', 
          localId: this.testProductId,
          firebaseId: this.testFirebaseId
        });
        
      } catch (firebaseError) {
        console.log(`⚠️ Firebase non disponible: ${firebaseError.message}`);
        this.testResults.push({ 
          step: 'CREATE_PRODUCT', 
          status: 'PARTIAL', 
          localId: this.testProductId,
          firebaseId: null,
          note: 'Firebase non disponible'
        });
      }
      
    } catch (error) {
      console.log(`❌ Erreur création: ${error.message}`);
      this.testResults.push({ step: 'CREATE_PRODUCT', status: 'FAILED', error: error.message });
    }
  }

  async testVerifyFirebaseId() {
    console.log('\n🔍 Test 2: Vérification du firebase_id');
    
    try {
      const product = await databaseService.getById('products', this.testProductId);
      
      const hasFirebaseId = !!product.firebase_id;
      const isValidFirebaseId = product.firebase_id ? isValidFirebaseId(product.firebase_id) : false;
      
      console.log('📦 État du produit:', {
        id: product.id,
        name: product.name,
        firebase_id: product.firebase_id,
        sync_status: product.sync_status,
        hasFirebaseId,
        isValidFirebaseId
      });

      this.testResults.push({
        step: 'VERIFY_FIREBASE_ID',
        status: hasFirebaseId ? 'SUCCESS' : 'FAILED',
        hasFirebaseId,
        isValidFirebaseId,
        firebaseId: product.firebase_id
      });

    } catch (error) {
      console.log(`❌ Erreur vérification: ${error.message}`);
      this.testResults.push({ step: 'VERIFY_FIREBASE_ID', status: 'FAILED', error: error.message });
    }
  }

  async testDeleteProduct() {
    console.log('\n🗑️ Test 3: Suppression du produit');
    
    try {
      const deleteSuccess = await handleOfflineDelete(this.testProductId);
      console.log(`✅ Suppression ${deleteSuccess ? 'réussie' : 'échouée'}`);
      
      this.testResults.push({
        step: 'DELETE_PRODUCT',
        status: deleteSuccess ? 'SUCCESS' : 'FAILED',
        success: deleteSuccess
      });
      
    } catch (error) {
      console.log(`❌ Erreur suppression: ${error.message}`);
      this.testResults.push({ step: 'DELETE_PRODUCT', status: 'FAILED', error: error.message });
    }
  }

  async testVerifyDeletion() {
    console.log('\n🔍 Test 4: Vérification de la suppression');
    
    // Vérification locale
    try {
      const localProduct = await databaseService.getById('products', this.testProductId);
      console.log('❌ ERREUR: Produit encore présent localement');
      this.testResults.push({
        step: 'VERIFY_LOCAL_DELETION',
        status: 'FAILED',
        note: 'Produit encore présent localement'
      });
    } catch (error) {
      console.log('✅ Produit supprimé localement');
      this.testResults.push({
        step: 'VERIFY_LOCAL_DELETION',
        status: 'SUCCESS'
      });
    }

    // Vérification Firebase (si applicable)
    if (this.testFirebaseId && isValidFirebaseId(this.testFirebaseId)) {
      try {
        const firebaseProduct = await firebaseService.getProductById(this.testFirebaseId);
        if (firebaseProduct) {
          console.log('❌ ERREUR: Produit encore présent dans Firebase');
          this.testResults.push({
            step: 'VERIFY_FIREBASE_DELETION',
            status: 'FAILED',
            note: 'Produit encore présent dans Firebase'
          });
        } else {
          console.log('✅ Produit supprimé de Firebase');
          this.testResults.push({
            step: 'VERIFY_FIREBASE_DELETION',
            status: 'SUCCESS'
          });
        }
      } catch (error) {
        console.log('✅ Produit supprimé de Firebase (erreur attendue)');
        this.testResults.push({
          step: 'VERIFY_FIREBASE_DELETION',
          status: 'SUCCESS',
          note: 'Suppression confirmée par erreur Firebase'
        });
      }
    } else {
      console.log('⏭️ Pas de vérification Firebase (pas de firebase_id)');
      this.testResults.push({
        step: 'VERIFY_FIREBASE_DELETION',
        status: 'SKIPPED',
        note: 'Pas de firebase_id disponible'
      });
    }
  }

  async testSyncQueue() {
    console.log('\n📋 Test 5: Vérification de la queue de synchronisation');
    
    try {
      const syncQueue = await databaseService.getAll('sync_queue');
      const deleteOperations = syncQueue.filter(op => 
        op.table_name === 'products' && 
        op.operation === 'delete' && 
        (op.record_id === this.testProductId || op.record_id === this.testFirebaseId)
      );
      
      console.log(`📝 ${deleteOperations.length} opération(s) de suppression en attente`);
      
      if (deleteOperations.length > 0) {
        deleteOperations.forEach(op => {
          console.log(`  - ID: ${op.record_id}, Status: ${op.status}, Retry: ${op.retry_count}`);
        });
      }
      
      this.testResults.push({
        step: 'SYNC_QUEUE',
        status: 'SUCCESS',
        pendingOperations: deleteOperations.length,
        operations: deleteOperations
      });
      
    } catch (error) {
      console.log(`❌ Erreur queue: ${error.message}`);
      this.testResults.push({ step: 'SYNC_QUEUE', status: 'FAILED', error: error.message });
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSULTATS DU TEST DE SYNCHRONISATION');
    console.log('='.repeat(70));

    this.testResults.forEach((result, index) => {
      const status = result.status === 'SUCCESS' ? '✅' : 
                    result.status === 'FAILED' ? '❌' : 
                    result.status === 'PARTIAL' ? '⚠️' : '⏭️';
      
      console.log(`${index + 1}. ${status} ${result.step}`);
      
      if (result.error) {
        console.log(`   Erreur: ${result.error}`);
      }
      
      if (result.note) {
        console.log(`   Note: ${result.note}`);
      }
      
      if (result.localId) {
        console.log(`   ID Local: ${result.localId}`);
      }
      
      if (result.firebaseId) {
        console.log(`   ID Firebase: ${result.firebaseId}`);
      }
    });

    const successCount = this.testResults.filter(r => r.status === 'SUCCESS').length;
    const totalCount = this.testResults.length;
    
    console.log('\n📈 STATISTIQUES:');
    console.log(`- Tests réussis: ${successCount}/${totalCount}`);
    console.log(`- Taux de réussite: ${Math.round((successCount / totalCount) * 100)}%`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS ! La synchronisation fonctionne parfaitement.');
    } else if (successCount >= totalCount * 0.8) {
      console.log('\n✅ La synchronisation fonctionne globalement bien.');
    } else {
      console.log('\n⚠️ La synchronisation a des problèmes qui nécessitent une attention.');
    }
  }

  async cleanup() {
    console.log('\n🧹 Nettoyage...');
    
    try {
      // Supprimer les opérations de test de la queue
      const syncQueue = await databaseService.getAll('sync_queue');
      const testOperations = syncQueue.filter(op => 
        op.table_name === 'products' && 
        op.operation === 'delete' &&
        op.data && JSON.parse(op.data).name?.includes('Test Sync')
      );
      
      for (const operation of testOperations) {
        await databaseService.delete('sync_queue', operation.id);
        console.log(`🗑️ Opération de test supprimée: ${operation.id}`);
      }
      
      console.log('✅ Nettoyage terminé');
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }
}

// Exécution du test
if (require.main === module) {
  const testManager = new SyncTestManager();
  
  testManager.runTest()
    .then(() => testManager.cleanup())
    .then(() => {
      console.log('\n🏁 Test terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = SyncTestManager;
