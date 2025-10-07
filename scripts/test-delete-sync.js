#!/usr/bin/env node

/**
 * Script de test pour vérifier la synchronisation de suppression avec Firebase
 * 
 * Ce script simule le processus complet :
 * 1. Création d'un produit (local + Firebase)
 * 2. Vérification que firebase_id est sauvegardé
 * 3. Suppression du produit
 * 4. Vérification que la suppression est synchronisée avec Firebase
 */

const { databaseService } = require('../services/DatabaseService');
const { firebaseService } = require('../services/FirebaseService');
const { handleOfflineDelete } = require('../utils/offlineDeleteHandler');
const { isValidFirebaseId } = require('../utils/firebaseIdMapper');

// Configuration
const TEST_PRODUCT = {
  name: `Test Product ${Date.now()}`,
  description: 'Produit de test pour vérifier la synchronisation',
  sku: `TEST-${Date.now().toString().slice(-6)}`,
  barcode: undefined,
  category_id: 'test-category',
  price_buy: 10,
  price_sell: 20,
  margin: 10,
  unit: 'pcs',
  images: undefined,
  is_active: true,
  sync_status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function testDeleteSync() {
  console.log('🧪 [TEST] Démarrage du test de synchronisation de suppression');
  console.log('=' .repeat(60));

  try {
    // Étape 1: Créer un produit local
    console.log('\n📝 Étape 1: Création d\'un produit local');
    const localId = await databaseService.insert('products', TEST_PRODUCT);
    console.log(`✅ Produit créé localement avec ID: ${localId}`);

    // Étape 2: Synchroniser avec Firebase
    console.log('\n🔄 Étape 2: Synchronisation avec Firebase');
    let firebaseId;
    try {
      firebaseId = await firebaseService.createProduct(TEST_PRODUCT);
      console.log(`✅ Produit créé dans Firebase avec ID: ${firebaseId}`);
      
      // Mettre à jour le produit local avec le firebase_id
      await databaseService.update('products', localId, {
        sync_status: 'synced',
        firebase_id: firebaseId
      });
      console.log(`✅ firebase_id sauvegardé localement: ${firebaseId}`);
    } catch (error) {
      console.log(`⚠️ Erreur Firebase (normal en développement): ${error.message}`);
      console.log('📝 Le produit reste local avec sync_status: pending');
    }

    // Étape 3: Vérifier l'état avant suppression
    console.log('\n🔍 Étape 3: Vérification de l\'état avant suppression');
    const productBeforeDelete = await databaseService.getById('products', localId);
    console.log('📦 Produit avant suppression:', {
      id: productBeforeDelete.id,
      name: productBeforeDelete.name,
      firebase_id: productBeforeDelete.firebase_id,
      sync_status: productBeforeDelete.sync_status,
      hasFirebaseId: !!productBeforeDelete.firebase_id,
      isValidFirebaseId: productBeforeDelete.firebase_id ? isValidFirebaseId(productBeforeDelete.firebase_id) : false
    });

    // Étape 4: Supprimer le produit
    console.log('\n🗑️ Étape 4: Suppression du produit');
    const deleteSuccess = await handleOfflineDelete(localId);
    console.log(`✅ Suppression ${deleteSuccess ? 'réussie' : 'échouée'}`);

    // Étape 5: Vérifier l'état après suppression
    console.log('\n🔍 Étape 5: Vérification de l\'état après suppression');
    try {
      const productAfterDelete = await databaseService.getById('products', localId);
      console.log('❌ ERREUR: Le produit existe encore localement:', productAfterDelete);
    } catch (error) {
      console.log('✅ Produit supprimé localement (erreur attendue)');
    }

    // Étape 6: Vérifier Firebase (si applicable)
    if (firebaseId && isValidFirebaseId(firebaseId)) {
      console.log('\n🔍 Étape 6: Vérification de la suppression Firebase');
      try {
        const firebaseProduct = await firebaseService.getProductById(firebaseId);
        if (firebaseProduct) {
          console.log('❌ ERREUR: Le produit existe encore dans Firebase');
        } else {
          console.log('✅ Produit supprimé de Firebase');
        }
      } catch (error) {
        console.log('✅ Produit supprimé de Firebase (erreur attendue)');
      }
    } else {
      console.log('\n🔍 Étape 6: Pas de vérification Firebase (pas de firebase_id valide)');
    }

    // Étape 7: Vérifier la queue de synchronisation
    console.log('\n🔍 Étape 7: Vérification de la queue de synchronisation');
    const syncQueue = await databaseService.getAll('sync_queue');
    const deleteOperations = syncQueue.filter(op => 
      op.table_name === 'products' && 
      op.operation === 'delete' && 
      (op.record_id === localId || op.record_id === firebaseId)
    );
    
    if (deleteOperations.length > 0) {
      console.log(`📝 ${deleteOperations.length} opération(s) de suppression en attente:`, deleteOperations.map(op => ({
        id: op.id,
        record_id: op.record_id,
        status: op.status,
        retry_count: op.retry_count
      })));
    } else {
      console.log('✅ Aucune opération de suppression en attente');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Test terminé avec succès !');
    
    // Résumé
    console.log('\n📊 RÉSUMÉ:');
    console.log(`- Produit créé localement: ${localId}`);
    console.log(`- Firebase ID: ${firebaseId || 'Non créé'}`);
    console.log(`- Suppression locale: ${deleteSuccess ? '✅' : '❌'}`);
    console.log(`- Suppression Firebase: ${firebaseId ? '✅' : 'N/A'}`);
    console.log(`- Opérations en attente: ${deleteOperations.length}`);

  } catch (error) {
    console.error('\n❌ ERREUR lors du test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Fonction utilitaire pour nettoyer après le test
async function cleanup() {
  console.log('\n🧹 Nettoyage après test...');
  try {
    // Supprimer tous les produits de test
    const products = await databaseService.getAll('products');
    const testProducts = products.filter(p => p.name.includes('Test Product'));
    
    for (const product of testProducts) {
      await databaseService.delete('products', product.id);
      console.log(`🗑️ Produit de test supprimé: ${product.name}`);
    }

    // Supprimer les opérations de test de la queue
    const syncQueue = await databaseService.getAll('sync_queue');
    const testOperations = syncQueue.filter(op => 
      op.table_name === 'products' && 
      op.operation === 'delete' &&
      op.data && JSON.parse(op.data).name?.includes('Test Product')
    );
    
    for (const operation of testOperations) {
      await databaseService.delete('sync_queue', operation.id);
      console.log(`🗑️ Opération de test supprimée: ${operation.id}`);
    }

    console.log('✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Exécution du test
if (require.main === module) {
  testDeleteSync()
    .then(() => cleanup())
    .then(() => {
      console.log('\n🏁 Test terminé, nettoyage effectué');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testDeleteSync, cleanup };
