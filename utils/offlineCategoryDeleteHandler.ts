import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';
import { isValidFirebaseId } from './firebaseIdMapper';

/**
 * Gère la suppression d'une catégorie en tenant compte du mode offline
 * @param categoryId - ID de la catégorie à supprimer (peut être local ou Firebase)
 * @returns Promise<boolean> - true si la suppression a réussi, false sinon
 */
export async function handleOfflineCategoryDelete(categoryId: string): Promise<boolean> {
  try {
    console.log('🗑️ [OFFLINE CATEGORY DELETE] Début suppression catégorie:', categoryId);

    // 1. Récupérer la catégorie avant suppression
    const categories = await databaseService.getAll('categories') as any[];
    const categoryToDelete = categories.find((c: any) => c.id === categoryId);
    
    if (!categoryToDelete) {
      console.log('⚠️ [OFFLINE CATEGORY DELETE] Catégorie non trouvée localement');
      return false;
    }

    console.log('📂 [OFFLINE CATEGORY DELETE] Catégorie trouvée:', categoryToDelete.name);

    // 2. Supprimer localement en priorité
    await databaseService.delete('categories', categoryId);
    console.log('✅ [OFFLINE CATEGORY DELETE] Catégorie supprimée localement');

    // 3. Essayer de supprimer de Firebase si l'ID Firebase existe
    const firebaseId = categoryToDelete.firebase_id;
    
    if (firebaseId && isValidFirebaseId(firebaseId)) {
      console.log('🔄 [OFFLINE CATEGORY DELETE] Tentative suppression Firebase:', firebaseId);
      
      try {
        await firebaseService.deleteCategory(firebaseId);
        console.log('✅ [OFFLINE CATEGORY DELETE] Catégorie supprimée de Firebase');
        return true;
      } catch (error) {
        console.log('⚠️ [OFFLINE CATEGORY DELETE] Échec suppression Firebase:', error);
        
        // Ajouter à la queue de sync pour tentative ultérieure
        await databaseService.insert('sync_queue', {
          table_name: 'categories',
          record_id: firebaseId,
          operation: 'delete',
          data: JSON.stringify(categoryToDelete),
          priority: 1,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
        
        console.log('📝 [OFFLINE CATEGORY DELETE] Ajouté à la queue de sync pour suppression Firebase');
        return true; // La suppression locale a réussi
      }
    } else {
      console.log('📱 [OFFLINE CATEGORY DELETE] Aucun ID Firebase - catégorie créée en mode offline uniquement');
      
      // Si la catégorie était synchronisée mais n'a pas de firebase_id, 
      // c'est peut-être un problème de synchronisation - ajouter à la queue
      if (categoryToDelete.sync_status === 'synced') {
        console.log('🔄 [OFFLINE CATEGORY DELETE] Catégorie marquée comme synchronisée mais pas de firebase_id - ajout à la queue');
        await databaseService.insert('sync_queue', {
          table_name: 'categories',
          record_id: categoryId,
          operation: 'delete',
          data: JSON.stringify(categoryToDelete),
          priority: 2, // Priorité plus faible car pas sûr de l'ID Firebase
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });
        console.log('📝 [OFFLINE CATEGORY DELETE] Ajouté à la queue de sync pour vérification');
      }
      
      return true; // La suppression locale a réussi
    }

  } catch (error) {
    console.error('❌ [OFFLINE CATEGORY DELETE] Erreur:', error);
    return false;
  }
}

/**
 * Vérifie si une catégorie peut être supprimée de Firebase
 * @param categoryId - ID de la catégorie
 * @returns Promise<boolean> - true si la catégorie existe dans Firebase
 */
export async function canDeleteCategoryFromFirebase(categoryId: string): Promise<boolean> {
  try {
    const categories = await databaseService.getAll('categories') as any[];
    const category = categories.find((c: any) => c.id === categoryId);
    
    if (!category) {
      return false;
    }

    return !!(category.firebase_id && isValidFirebaseId(category.firebase_id));
  } catch (error) {
    console.error('❌ [CAN DELETE CATEGORY] Erreur vérification:', error);
    return false;
  }
}
