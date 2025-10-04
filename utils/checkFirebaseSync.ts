// Utilitaire pour vérifier et corriger la synchronisation Firebase
import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';

export const checkAndFixFirebaseSync = async () => {
  try {
    console.log('🔍 [FIREBASE CHECK] Vérification de la synchronisation Firebase...');
    
    // 1. Récupérer tous les produits locaux
    const localProducts = await databaseService.getAll('products');
    console.log(`📦 [FIREBASE CHECK] Produits locaux: ${localProducts.length}`);
    
    // 2. Récupérer tous les produits Firebase
    const firebaseProducts = await firebaseService.getProducts();
    console.log(`🌐 [FIREBASE CHECK] Produits Firebase: ${firebaseProducts.length}`);
    
    // 3. Identifier les produits manquants dans Firebase
    const localIds = new Set(localProducts.map((p: any) => p.id));
    const firebaseIds = new Set(firebaseProducts.map((p: any) => p.id));
    
    const missingInFirebase = localProducts.filter((product: any) => 
      !firebaseIds.has(product.id) && product.sync_status === 'synced'
    );
    
    console.log(`❌ [FIREBASE CHECK] Produits manquants dans Firebase: ${missingInFirebase.length}`);
    
    if (missingInFirebase.length === 0) {
      console.log('✅ [FIREBASE CHECK] Tous les produits sont bien dans Firebase !');
      return {
        local: localProducts.length,
        firebase: firebaseProducts.length,
        missing: 0,
        fixed: 0
      };
    }
    
    // 4. Corriger les produits manquants
    console.log('🔧 [FIREBASE CHECK] Correction des produits manquants...');
    let fixedCount = 0;
    
    for (const product of missingInFirebase) {
      try {
        console.log(`🔄 [FIREBASE CHECK] Création dans Firebase: "${product.name}"`);
        
        // Créer le produit dans Firebase
        const firebaseId = await firebaseService.createProduct({
          name: product.name,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          category_id: product.category_id,
          price_buy: product.price_buy,
          price_sell: product.price_sell,
          margin: product.margin,
          unit: product.unit,
          images: product.images,
          is_active: product.is_active,
        });
        
        // Mettre à jour le produit local avec l'ID Firebase
        await databaseService.update('products', product.id, {
          firebase_id: firebaseId,
          sync_status: 'synced'
        });
        
        console.log(`✅ [FIREBASE CHECK] "${product.name}" créé dans Firebase: ${firebaseId}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ [FIREBASE CHECK] Erreur création "${product.name}":`, error);
      }
    }
    
    // 5. Vérification finale
    const finalFirebaseProducts = await firebaseService.getProducts();
    
    console.log('📊 [FIREBASE CHECK] Résumé final:');
    console.log(`   📦 Produits locaux: ${localProducts.length}`);
    console.log(`   🌐 Produits Firebase: ${finalFirebaseProducts.length}`);
    console.log(`   ❌ Produits manquants: ${missingInFirebase.length}`);
    console.log(`   ✅ Produits corrigés: ${fixedCount}`);
    
    return {
      local: localProducts.length,
      firebase: finalFirebaseProducts.length,
      missing: missingInFirebase.length,
      fixed: fixedCount
    };
    
  } catch (error) {
    console.error('❌ [FIREBASE CHECK] Erreur vérification Firebase:', error);
    throw error;
  }
};
