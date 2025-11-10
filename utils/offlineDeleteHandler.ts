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

    // 2. Si on a un firebase_id valide → ONLINE FIRST: supprimer dans Firebase d'abord
    const firebaseId = productToDelete.firebase_id;
    if (firebaseId && isValidFirebaseId(firebaseId)) {
      console.log('🌐 [OFFLINE DELETE] Suppression ONLINE-FIRST, Firebase ID:', firebaseId);
      try {
        await firebaseService.deleteProduct(firebaseId);
        console.log('✅ [OFFLINE DELETE] Produit supprimé de Firebase');

        // Puis supprimer localement
        await databaseService.delete('products', productId);
        console.log('✅ [OFFLINE DELETE] Produit supprimé localement');
        return true;
      } catch (error) {
        console.log('⚠️ [OFFLINE DELETE] Échec suppression Firebase, fallback local + queue:', error);

        // Fallback: supprimer localement pour une UX immédiate
        await databaseService.delete('products', productId);
        console.log('✅ [OFFLINE DELETE] Produit supprimé localement (fallback)');

        // Ajouter à la queue de sync pour suppression Firebase ultérieure
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
        return true;
      }
    }

    // 3. Pas de firebase_id → tenter de le retrouver par signature et supprimer côté Firebase
    console.log('📱 [OFFLINE DELETE] Aucun ID Firebase - tentative de recherche par signature');

    try {
      const guessedId = await firebaseService.findProductIdBySignature({
        createdBy: productToDelete.created_by,
        sku: productToDelete.sku,
        name: productToDelete.name,
        createdAtIso: productToDelete.created_at,
        timeWindowMs: 10 * 60 * 1000, // 10 minutes de fenêtre
      });

      if (guessedId) {
        console.log('🔍 [OFFLINE DELETE] ID Firebase retrouvé par signature:', guessedId);
        try {
          await firebaseService.deleteProduct(guessedId);
          console.log('✅ [OFFLINE DELETE] Produit supprimé de Firebase via signature');
        } catch (e) {
          console.log('⚠️ [OFFLINE DELETE] Échec suppression Firebase via signature, ajout queue');
          await databaseService.insert('sync_queue', {
            table_name: 'products',
            record_id: guessedId,
            operation: 'delete',
            data: JSON.stringify(productToDelete),
            priority: 1,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        console.log('⚠️ [OFFLINE DELETE] Aucun ID trouvé par signature');
        if (productToDelete.sync_status === 'synced') {
          await databaseService.insert('sync_queue', {
            table_name: 'products',
            record_id: productId,
            operation: 'delete',
            data: JSON.stringify(productToDelete),
            priority: 2,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString(),
          });
          console.log('📝 [OFFLINE DELETE] Ajouté à la queue de sync pour vérification');
        }
      }
    } catch (e) {
      console.log('⚠️ [OFFLINE DELETE] Erreur recherche par signature:', e);
    }

    // 4. Supprimer localement dans tous les cas
    await databaseService.delete('products', productId);
    console.log('✅ [OFFLINE DELETE] Produit supprimé localement');
    return true;
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
