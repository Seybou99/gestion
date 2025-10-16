// Utilitaire pour nettoyer les données de test
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Nettoie les données de test existantes
 */
export const clearTestData = async (): Promise<{
  success: boolean;
  message: string;
  cleared: number;
}> => {
  try {
    console.log('🧹 Nettoyage des données de test...');
    
    // Tables à nettoyer
    const tables = [
      'products',
      'stock', 
      'categories',
      'locations',
      'inventory',
      'customers',
      'sales',
      'sale_items',
      'sync_queue'
    ];
    
    let totalCleared = 0;
    
    for (const table of tables) {
      try {
        const existing = await AsyncStorage.getItem(table);
        if (existing) {
          const items = JSON.parse(existing);
          console.log(`📊 ${table}: ${items.length} éléments trouvés`);
          
          // Filtrer les données de test
          const filteredItems = items.filter((item: any) => {
            // Supprimer les emplacements de test
            if (table === 'locations' && item.name === 'Magasin Principal') {
              return false;
            }
            
            // Supprimer les produits de test
            if (table === 'products' && item.name && item.name.includes('Test')) {
              return false;
            }
            
            // Supprimer les stocks orphelins (sans produit correspondant)
            if (table === 'stock') {
              // On garde tous les stocks pour l'instant, ils seront filtrés côté UI
              return true;
            }
            
            return true;
          });
          
          if (filteredItems.length !== items.length) {
            await AsyncStorage.setItem(table, JSON.stringify(filteredItems));
            const removed = items.length - filteredItems.length;
            console.log(`✅ ${table}: ${removed} éléments de test supprimés`);
            totalCleared += removed;
          }
        }
      } catch (error) {
        console.error(`❌ Erreur nettoyage ${table}:`, error);
      }
    }
    
    return {
      success: true,
      message: `Nettoyage terminé ! ${totalCleared} éléments supprimés`,
      cleared: totalCleared
    };
    
  } catch (error) {
    console.error('❌ Erreur nettoyage général:', error);
    return {
      success: false,
      message: `Erreur lors du nettoyage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      cleared: 0
    };
  }
};

/**
 * Vide complètement toutes les données (ATTENTION: destructif)
 */
export const clearAllData = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('⚠️ VIDAGE COMPLET de toutes les données...');
    
    const tables = [
      'products',
      'stock', 
      'categories',
      'locations',
      'inventory',
      'customers',
      'sales',
      'sale_items',
      'sync_queue',
      'sync_metadata',
      'warehouse',
      'authToken',
      'userInfo'
    ];
    
    for (const table of tables) {
      await AsyncStorage.removeItem(table);
      console.log(`🗑️ ${table}: vidé`);
    }
    
    return {
      success: true,
      message: 'Toutes les données ont été supprimées'
    };
    
  } catch (error) {
    console.error('❌ Erreur vidage complet:', error);
    return {
      success: false,
      message: `Erreur lors du vidage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
};
