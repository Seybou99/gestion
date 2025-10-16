#!/usr/bin/env node

/**
 * Script pour nettoyer les données de test existantes
 * Utilisation: node scripts/clear-test-data.js
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const clearTestData = async () => {
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
          
          // Filtrer les données de test (Magasin Principal, etc.)
          const filteredItems = items.filter(item => {
            // Supprimer les emplacements de test
            if (table === 'locations' && item.name === 'Magasin Principal') {
              return false;
            }
            
            // Supprimer les produits de test (optionnel)
            if (table === 'products' && item.name && item.name.includes('Test')) {
              return false;
            }
            
            return true;
          });
          
          if (filteredItems.length !== items.length) {
            await AsyncStorage.setItem(table, JSON.stringify(filteredItems));
            const removed = items.length - filteredItems.length;
            console.log(`✅ ${table}: ${removed} éléments de test supprimés`);
            totalCleared += removed;
          } else {
            console.log(`✅ ${table}: Aucun élément de test à supprimer`);
          }
        } else {
          console.log(`✅ ${table}: Vide`);
        }
      } catch (error) {
        console.error(`❌ Erreur nettoyage ${table}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Nettoyage terminé ! ${totalCleared} éléments de test supprimés`);
    console.log('📱 Redémarrez l\'application pour voir les changements');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
};

// Exécuter le script
if (require.main === module) {
  clearTestData();
}

module.exports = { clearTestData };
