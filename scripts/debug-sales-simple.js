// Script simple pour diagnostiquer les ventes
// Ce script doit être exécuté dans l'application React Native

console.log('🔍 [DEBUG SALES] Script de diagnostic des ventes');
console.log('📋 [DEBUG SALES] Instructions:');
console.log('1. Ouvrez la console de l\'application React Native');
console.log('2. Copiez et collez le code ci-dessous dans la console');
console.log('3. Appuyez sur Entrée pour exécuter');

console.log(`
// Code à coller dans la console de l'application:
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function debugSalesInApp() {
  try {
    console.log('🔍 [DEBUG SALES] Début du diagnostic dans l\\'app...');
    
    // 1. Vérifier les ventes
    const salesData = await AsyncStorage.getItem('sales');
    if (salesData) {
      const sales = JSON.parse(salesData);
      console.log('✅ [DEBUG SALES]', sales.length, 'ventes trouvées');
      
      sales.forEach((sale, index) => {
        console.log('📋 [DEBUG SALES] Vente', index + 1, ':', {
          id: sale.id,
          user_id: sale.user_id,
          created_by: sale.created_by,
          total_amount: sale.total_amount,
          sale_date: sale.sale_date,
          sync_status: sale.sync_status
        });
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucune vente trouvée');
    }
    
    // 2. Vérifier les items de vente
    const saleItemsData = await AsyncStorage.getItem('sale_items');
    if (saleItemsData) {
      const saleItems = JSON.parse(saleItemsData);
      console.log('✅ [DEBUG SALES]', saleItems.length, 'items de vente trouvés');
      
      saleItems.forEach((item, index) => {
        console.log('🛒 [DEBUG SALES] Item', index + 1, ':', {
          sale_id: item.sale_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucun item de vente trouvé');
    }
    
    // 3. Vérifier la queue de synchronisation
    const syncQueueData = await AsyncStorage.getItem('sync_queue');
    if (syncQueueData) {
      const syncQueue = JSON.parse(syncQueueData);
      const salesInQueue = syncQueue.filter(item => item.table === 'sales');
      console.log('✅ [DEBUG SALES]', salesInQueue.length, 'ventes dans la queue');
      
      salesInQueue.forEach((item, index) => {
        console.log('🔄 [DEBUG SALES] Queue Item', index + 1, ':', {
          table: item.table,
          id: item.id,
          operation: item.operation,
          user_id: item.data.user_id,
          created_by: item.data.created_by,
          total_amount: item.data.total_amount
        });
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucune queue de synchronisation');
    }
    
    console.log('✅ [DEBUG SALES] Diagnostic terminé !');
    
  } catch (error) {
    console.error('❌ [DEBUG SALES] Erreur:', error);
  }
}

// Exécuter le diagnostic
debugSalesInApp();
`);
