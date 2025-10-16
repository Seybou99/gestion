import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';
import { isValidFirebaseId } from './firebaseIdMapper';

/**
 * Gère la suppression d'un produit en tenant compte du mode offline
 * @param productId - ID du produit à supprimer (peut être local ou Firebase)
 * @returns Promise<boolean> - true si la suppression a réussi, false sinon
 */
export async function handleOfflineDelete(productId: string): Promise<boolean> {
  try {
    console.log('🗑️ [OFFLINE DELETE] Début suppression produit:', productId);

    // 1. Récupérer le produit avant suppression
    const products = await databaseService.getAll('products');
    const productToDelete = products.find((p: any) => p.id === productId);
    
    if (!productToDelete) {
      console.log('⚠️ [OFFLINE DELETE] Produit non trouvé localement');
      return false;
    }

    console.log('📦 [OFFLINE DELETE] Produit trouvé:', productToDelete.name);

    // 2. Supprimer localement en priorité
    await databaseService.delete('products', productId);
    console.log('✅ [OFFLINE DELETE] Produit supprimé localement');

    // 3. Essayer de supprimer de Firebase si l'ID Firebase existe
    const firebaseId = productToDelete.firebase_id;
    
    if (firebaseId && isValidFirebaseId(firebaseId)) {
      console.log('🔄 [OFFLINE DELETE] Tentative suppression Firebase:', firebaseId);
      
      try {
        await firebaseService.deleteProduct(firebaseId);
        console.log('✅ [OFFLINE DELETE] Produit supprimé de Firebase');
        return true;
      } catch (error) {
        console.log('⚠️ [OFFLINE DELETE] Échec suppression Firebase:', error);
        
        // Ajouter à la queue de sync pour tentative ultérieure
        await databaseService.insert('sync_queue', {
          table_name: 'products',
          record_id: firebaseId,
          operation: 'delete',
          data: JSON.stringify(productToDelete),
          priority: 1,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
        
        console.log('📝 [OFFLINE DELETE] Ajouté à la queue de sync pour suppression Firebase');
        return true; // La suppression locale a réussi
      }
    } else {
      console.log('📱 [OFFLINE DELETE] Aucun ID Firebase - produit créé en mode offline uniquement');
      
      // Si le produit était synchronisé mais n'a pas de firebase_id, 
      // c'est peut-être un problème de synchronisation - ajouter à la queue
      if (productToDelete.sync_status === 'synced') {
        console.log('🔄 [OFFLINE DELETE] Produit marqué comme synchronisé mais pas de firebase_id - ajout à la queue');
        await databaseService.insert('sync_queue', {
          table_name: 'products',
          record_id: productId,
          operation: 'delete',
          data: JSON.stringify(productToDelete),
          priority: 2, // Priorité plus faible car pas sûr de l'ID Firebase
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
        console.log('📝 [OFFLINE DELETE] Ajouté à la queue de sync pour vérification');
      }
      
      return true; // La suppression locale a réussi
    }

  } catch (error) {
    console.error('❌ [OFFLINE DELETE] Erreur:', error);
    return false;
  }
}

/**
 * Vérifie si un produit peut être supprimé de Firebase
 * @param productId - ID du produit
 * @returns Promise<boolean> - true si le produit existe dans Firebase
 */
export async function canDeleteFromFirebase(productId: string): Promise<boolean> {
  try {
    const products = await databaseService.getAll('products');
    const product = products.find((p: any) => p.id === productId);
    
    if (!product) {
      return false;
    }

    return !!(product.firebase_id && isValidFirebaseId(product.firebase_id));
  } catch (error) {
    console.error('❌ [CAN DELETE] Erreur vérification:', error);
    return false;
  }
}
