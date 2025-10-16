#!/usr/bin/env node

/**
 * Script pour nettoyer complètement le stockage AsyncStorage
 * Utilisation: node scripts/clear-storage.js
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const clearAllStorage = async () => {
  try {
    console.log('🧹 Nettoyage complet du stockage AsyncStorage...');
    
    // Toutes les clés possibles
    const allKeys = [
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
    
    let totalCleared = 0;
    
    for (const key of allKeys) {
      try {
        const existing = await AsyncStorage.getItem(key);
        if (existing) {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ ${key}: supprimé`);
          totalCleared++;
        } else {
          console.log(`✅ ${key}: déjà vide`);
        }
      } catch (error) {
        console.error(`❌ Erreur suppression ${key}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Nettoyage terminé ! ${totalCleared} clés supprimées`);
    console.log('📱 Redémarrez complètement l\'application pour voir les changements');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
};

// Exécuter le script
if (require.main === module) {
  clearAllStorage();
}

module.exports = { clearAllStorage };
