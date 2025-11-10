#!/usr/bin/env node

/**
 * Script pour corriger les product_id des stocks orphelins
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

async function fixStockProductIds() {
  try {
    console.log('🔧 [FIX STOCK] Début de la correction des product_id...');
    
    // 1. Récupérer tous les produits
    const productsSnapshot = await db.collection('products')
      .where('created_by', '==', 'YeZ6BMBBXxVtwXolZ5j6mh7KK5l2')
      .get();
    
    console.log(`📦 [FIX STOCK] ${productsSnapshot.size} produits trouvés`);
    
    // 2. Créer un mapping des anciens IDs vers les nouveaux
    const productMapping = new Map();
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      // Chercher les anciens IDs locaux dans les métadonnées ou autres champs
      if (product.firebase_id) {
        productMapping.set(product.firebase_id, doc.id);
      }
      // Mapper aussi par nom pour les cas où on peut deviner
      productMapping.set(product.name, doc.id);
    });
    
    console.log('🗺️ [FIX STOCK] Mapping créé:', Array.from(productMapping.entries()));
    
    // 3. Récupérer tous les stocks
    const stockSnapshot = await db.collection('stock')
      .where('created_by', '==', 'YeZ6BMBBXxVtwXolZ5j6mh7KK5l2')
      .get();
    
    console.log(`📊 [FIX STOCK] ${stockSnapshot.size} stocks trouvés`);
    
    // 4. Corriger les product_id orphelins
    let fixedCount = 0;
    const batch = db.batch();
    
    stockSnapshot.forEach(doc => {
      const stock = doc.data();
      const currentProductId = stock.product_id;
      
      // Vérifier si le product_id existe dans les produits
      const productExists = productsSnapshot.docs.some(prodDoc => prodDoc.id === currentProductId);
      
      if (!productExists) {
        console.log(`🔍 [FIX STOCK] Stock orphelin détecté: ${doc.id} -> product_id: ${currentProductId}`);
        
        // Essayer de trouver le bon produit par nom ou autres critères
        let newProductId = null;
        
        // Stratégie 1: Chercher par nom de produit dans les métadonnées du stock
        if (stock.product_name) {
          newProductId = productMapping.get(stock.product_name);
        }
        
        // Stratégie 2: Si pas trouvé, prendre le premier produit disponible
        if (!newProductId && productsSnapshot.size > 0) {
          newProductId = productsSnapshot.docs[0].id;
          console.log(`⚠️ [FIX STOCK] Utilisation du premier produit disponible: ${newProductId}`);
        }
        
        if (newProductId) {
          console.log(`✅ [FIX STOCK] Correction: ${currentProductId} -> ${newProductId}`);
          batch.update(doc.ref, { 
            product_id: newProductId,
            updated_at: new Date().toISOString()
          });
          fixedCount++;
        } else {
          console.log(`❌ [FIX STOCK] Impossible de corriger le stock ${doc.id}`);
        }
      }
    });
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ [FIX STOCK] ${fixedCount} stocks corrigés avec succès`);
    } else {
      console.log('✅ [FIX STOCK] Aucun stock à corriger');
    }
    
    console.log('🎉 [FIX STOCK] Correction terminée');
    
  } catch (error) {
    console.error('❌ [FIX STOCK] Erreur:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter le script
fixStockProductIds();


