#!/usr/bin/env node

/**
 * Script pour corriger automatiquement les product_id des stocks dans Firebase
 * Ce script va mapper les anciens IDs locaux vers les nouveaux IDs Firebase
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configuration Firebase Admin
const serviceAccount = require('./firebase-admin-config.js');

// Initialiser Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function fixStockProductIdsInFirebase() {
  try {
    console.log('🔧 [FIREBASE FIX] Début de la correction des product_id dans Firebase...');
    
    // 1. Récupérer tous les produits
    const productsSnapshot = await db.collection('products')
      .where('created_by', '==', 'YeZ6BMBBXxVtwXolZ5j6mh7KK5l2')
      .get();
    
    console.log(`📦 [FIREBASE FIX] ${productsSnapshot.size} produits trouvés dans Firebase`);
    
    // Afficher les produits disponibles
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      console.log(`  - ${doc.id}: ${product.name} (${product.sku})`);
    });
    
    // 2. Récupérer tous les stocks
    const stockSnapshot = await db.collection('stock')
      .where('created_by', '==', 'YeZ6BMBBXxVtwXolZ5j6mh7KK5l2')
      .get();
    
    console.log(`📊 [FIREBASE FIX] ${stockSnapshot.size} stocks trouvés dans Firebase`);
    
    // 3. Créer un mapping intelligent des anciens IDs vers les nouveaux
    const productMapping = new Map();
    
    // Stratégie 1: Mapping par nom de produit (si disponible dans les métadonnées)
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      productMapping.set(product.name, doc.id);
      productMapping.set(product.sku, doc.id);
    });
    
    // Stratégie 2: Mapping par ordre de création (approximation)
    const productsArray = Array.from(productsSnapshot.docs);
    const oldIds = [
      'id-mgus59fc-db80n9hm9ku',
      'id-mgus8qfx-o6p2ny4qefs', 
      'id-mgus3xgc-ur9d89r50e'
    ];
    
    // Associer les anciens IDs aux produits par ordre
    oldIds.forEach((oldId, index) => {
      if (productsArray[index]) {
        productMapping.set(oldId, productsArray[index].id);
        console.log(`🗺️ [FIREBASE FIX] Mapping: ${oldId} -> ${productsArray[index].id} (${productsArray[index].data().name})`);
      }
    });
    
    // 4. Corriger les stocks orphelins
    let fixedCount = 0;
    const batch = db.batch();
    
    stockSnapshot.forEach(doc => {
      const stock = doc.data();
      const currentProductId = stock.product_id;
      
      // Vérifier si le product_id existe dans les produits
      const productExists = productsSnapshot.docs.some(prodDoc => prodDoc.id === currentProductId);
      
      if (!productExists) {
        console.log(`🔍 [FIREBASE FIX] Stock orphelin détecté: ${doc.id} -> product_id: ${currentProductId}`);
        
        // Trouver le nouveau product_id
        let newProductId = productMapping.get(currentProductId);
        
        if (newProductId) {
          console.log(`✅ [FIREBASE FIX] Correction: ${currentProductId} -> ${newProductId}`);
          batch.update(doc.ref, { 
            product_id: newProductId,
            updated_at: new Date().toISOString()
          });
          fixedCount++;
        } else {
          console.log(`❌ [FIREBASE FIX] Impossible de mapper ${currentProductId}, suppression du stock`);
          batch.delete(doc.ref);
          fixedCount++;
        }
      } else {
        console.log(`✅ [FIREBASE FIX] Stock valide: ${doc.id} -> product_id: ${currentProductId}`);
      }
    });
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ [FIREBASE FIX] ${fixedCount} stocks corrigés/supprimés avec succès`);
    } else {
      console.log('✅ [FIREBASE FIX] Aucun stock à corriger');
    }
    
    console.log('🎉 [FIREBASE FIX] Correction terminée');
    
  } catch (error) {
    console.error('❌ [FIREBASE FIX] Erreur:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter le script
fixStockProductIdsInFirebase();


