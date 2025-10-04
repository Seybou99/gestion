// Utilitaire pour forcer la synchronisation de TOUS les articles pending
import { databaseService } from '../services/DatabaseService';

export const forceSyncAllProducts = async () => {
  try {
    console.log('🔄 [FORCE ALL] Début de la synchronisation forcée de TOUS les produits...');
    
    // 1. Récupérer tous les produits locaux
    const allProducts = await databaseService.getAll('products');
    console.log(`📦 [FORCE ALL] Total produits locaux: ${allProducts.length}`);
    
    // 2. Identifier les produits pending
    const pendingProducts = allProducts.filter((product: any) => product.sync_status === 'pending');
    console.log(`⏳ [FORCE ALL] Produits pending: ${pendingProducts.length}`);
    
    // 3. Identifier les produits déjà synchronisés
    const syncedProducts = allProducts.filter((product: any) => product.sync_status === 'synced');
    console.log(`✅ [FORCE ALL] Produits déjà synchronisés: ${syncedProducts.length}`);
    
    if (pendingProducts.length === 0) {
      console.log('✅ [FORCE ALL] Aucun produit pending à synchroniser');
      return {
        totalLocal: allProducts.length,
        pending: pendingProducts.length,
        synced: syncedProducts.length,
        addedToQueue: 0
      };
    }
    
    // 4. Vider la queue existante pour éviter les doublons
    console.log('🧹 [FORCE ALL] Nettoyage de la queue existante...');
    const existingQueue = await databaseService.getAll('sync_queue');
    for (const item of existingQueue) {
      if (item.table_name === 'products' && item.operation === 'create') {
        await databaseService.delete('sync_queue', item.id);
        console.log(`🗑️ [FORCE ALL] Supprimé de la queue: ${item.record_id}`);
      }
    }
    
    // 5. Ajouter TOUS les produits pending à la queue
    console.log('📝 [FORCE ALL] Ajout de TOUS les produits pending à la queue...');
    for (const product of pendingProducts) {
      try {
        console.log(`🔄 [FORCE ALL] Ajout: "${product.name}" (${product.id})`);
        
        await databaseService.insert('sync_queue', {
          table_name: 'products',
          record_id: product.id,
          operation: 'create',
          data: JSON.stringify({
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
          }),
          priority: 1,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
        
        console.log(`✅ [FORCE ALL] "${product.name}" ajouté à la queue`);
      } catch (error) {
        console.error(`❌ [FORCE ALL] Erreur ajout "${product.name}":`, error);
      }
    }
    
    // 6. Résumé final
    console.log('📊 [FORCE ALL] Résumé:');
    console.log(`   📦 Total produits locaux: ${allProducts.length}`);
    console.log(`   ⏳ Produits pending: ${pendingProducts.length}`);
    console.log(`   ✅ Produits déjà synced: ${syncedProducts.length}`);
    console.log(`   📝 Articles ajoutés à la queue: ${pendingProducts.length}`);
    
    console.log('✅ [FORCE ALL] Synchronisation forcée terminée - Prêt pour la sync !');
    
    return {
      totalLocal: allProducts.length,
      pending: pendingProducts.length,
      synced: syncedProducts.length,
      addedToQueue: pendingProducts.length
    };
    
  } catch (error) {
    console.error('❌ [FORCE ALL] Erreur synchronisation forcée:', error);
    throw error;
  }
};
