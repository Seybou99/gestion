// Script pour nettoyer les stocks orphelins (sans produit correspondant)
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanOrphanStocks() {
  try {
    console.log('🔍 [CLEAN ORPHAN] Début du nettoyage des stocks orphelins...');
    
    // 1. Récupérer tous les stocks
    const stocksSnapshot = await db.collection('stock').get();
    console.log(`📊 [CLEAN ORPHAN] ${stocksSnapshot.size} stocks trouvés`);
    
    // 2. Récupérer tous les produits
    const productsSnapshot = await db.collection('products').get();
    const productIds = new Set();
    productsSnapshot.forEach(doc => {
      productIds.add(doc.data().id || doc.id);
    });
    console.log(`📦 [CLEAN ORPHAN] ${productIds.size} produits trouvés`);
    
    // 3. Identifier les stocks orphelins
    const orphanStocks = [];
    stocksSnapshot.forEach(doc => {
      const stock = doc.data();
      const productId = stock.product_id;
      
      // Vérifier si le produit existe
      if (!productIds.has(productId)) {
        orphanStocks.push({
          id: doc.id,
          product_id: productId,
          created_by: stock.created_by,
          quantity_current: stock.quantity_current
        });
      }
    });
    
    console.log(`⚠️ [CLEAN ORPHAN] ${orphanStocks.length} stocks orphelins trouvés`);
    
    // 4. Afficher les détails
    if (orphanStocks.length > 0) {
      console.log('\n📋 [CLEAN ORPHAN] Détails des stocks orphelins :');
      orphanStocks.forEach((stock, index) => {
        console.log(`  ${index + 1}. Stock ID: ${stock.id}`);
        console.log(`     Product ID: ${stock.product_id} (INTROUVABLE)`);
        console.log(`     Created by: ${stock.created_by}`);
        console.log(`     Quantité: ${stock.quantity_current}`);
        console.log('');
      });
      
      // 5. Demander confirmation pour supprimer
      console.log('⚠️ [CLEAN ORPHAN] Pour supprimer ces stocks orphelins :');
      console.log('   1. Vérifiez que les product_ids sont vraiment inexistants');
      console.log('   2. Décommentez la section "SUPPRESSION" ci-dessous');
      console.log('   3. Relancez le script');
      
      // SUPPRESSION (décommentez pour supprimer)
      /*
      console.log('\n🗑️ [CLEAN ORPHAN] Suppression des stocks orphelins...');
      for (const stock of orphanStocks) {
        await db.collection('stock').doc(stock.id).delete();
        console.log(`✅ [CLEAN ORPHAN] Stock ${stock.id} supprimé`);
      }
      console.log('✅ [CLEAN ORPHAN] Nettoyage terminé !');
      */
      
    } else {
      console.log('✅ [CLEAN ORPHAN] Aucun stock orphelin trouvé !');
    }
    
    console.log('\n✅ [CLEAN ORPHAN] Diagnostic terminé');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ [CLEAN ORPHAN] Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le nettoyage
cleanOrphanStocks();
