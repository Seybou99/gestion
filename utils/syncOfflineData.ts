// Utilitaire pour synchroniser les données créées en mode offline
import { databaseService } from '../services/DatabaseService';

export const syncOfflineArticles = async () => {
  try {
    console.log('🔄 [SYNC] Recherche d\'articles en attente de synchronisation...');
    
    // Récupérer tous les articles avec sync_status = 'pending'
    const products = await databaseService.getAll('products');
    const pendingProducts = products.filter((product: any) => product.sync_status === 'pending');
    
    console.log(`📦 [SYNC] Trouvé ${pendingProducts.length} articles en attente de synchronisation`);
    
    if (pendingProducts.length === 0) {
      console.log('✅ [SYNC] Aucun article en attente de synchronisation');
      return;
    }
    
    // Ajouter chaque article à la queue de synchronisation
    for (const product of pendingProducts) {
      try {
        // Vérifier si l'article est déjà dans la queue
        const existingQueue = await databaseService.getAll('sync_queue');
        const alreadyInQueue = existingQueue.some((item: any) => 
          item.table_name === 'products' && 
          item.record_id === product.id && 
          item.operation === 'create' &&
          item.status === 'pending'
        );
        
        if (!alreadyInQueue) {
          console.log(`🔄 [SYNC] Ajout de l'article "${product.name}" à la queue de synchronisation`);
          
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
          
          console.log(`✅ [SYNC] Article "${product.name}" ajouté à la queue`);
        } else {
          console.log(`⏭️ [SYNC] Article "${product.name}" déjà dans la queue`);
        }
      } catch (error) {
        console.error(`❌ [SYNC] Erreur ajout article "${product.name}":`, error);
      }
    }
    
    console.log('✅ [SYNC] Synchronisation des articles offline terminée');
    
  } catch (error) {
    console.error('❌ [SYNC] Erreur synchronisation articles offline:', error);
  }
};

// Fonction pour forcer la synchronisation de tous les articles pending
export const forceSyncAllPendingArticles = async () => {
  try {
    console.log('🔄 [FORCE SYNC] Recherche de tous les articles pending...');
    
    // Récupérer tous les articles avec sync_status = 'pending'
    const products = await databaseService.getAll('products');
    const pendingProducts = products.filter((product: any) => product.sync_status === 'pending');
    
    console.log(`📦 [FORCE SYNC] Trouvé ${pendingProducts.length} articles pending`);
    
    if (pendingProducts.length === 0) {
      console.log('✅ [FORCE SYNC] Aucun article pending trouvé');
      return;
    }
    
    // Forcer l'ajout à la queue (même s'ils y sont déjà)
    for (const product of pendingProducts) {
      try {
        console.log(`🔄 [FORCE SYNC] Ajout forcé de l'article "${product.name}" à la queue`);
        
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
        
        console.log(`✅ [FORCE SYNC] Article "${product.name}" ajouté à la queue`);
      } catch (error) {
        console.error(`❌ [FORCE SYNC] Erreur ajout article "${product.name}":`, error);
      }
    }
    
    console.log('✅ [FORCE SYNC] Ajout forcé terminé');
    
  } catch (error) {
    console.error('❌ [FORCE SYNC] Erreur ajout forcé:', error);
  }
};
