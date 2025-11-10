// Script pour tester la création d'une vente de test
// Ce script doit être exécuté dans l'application React Native

console.log('🧪 [TEST SALE] Script de test de création de vente');
console.log('📋 [TEST SALE] Instructions:');
console.log('1. Ouvrez la console de l\'application React Native');
console.log('2. Copiez et collez le code ci-dessous dans la console');
console.log('3. Appuyez sur Entrée pour exécuter');

console.log(`
// Code à coller dans la console de l'application:
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function testSaleCreation() {
  try {
    console.log('🧪 [TEST SALE] Début du test de création de vente...');
    
    // 1. Créer une vente de test
    const testSale = {
      id: 'test-sale-' + Date.now(),
      user_id: 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2',
      customer_id: null,
      location_id: 'default_location',
      total_amount: 1000,
      tax_amount: 180,
      discount_amount: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      sale_date: new Date().toISOString(),
      created_by: 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2',
      created_by_name: 'diokolo1@gmail.com',
      notes: 'Test de création de vente',
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('🧪 [TEST SALE] Vente de test créée:', testSale);
    
    // 2. Sauvegarder dans AsyncStorage
    const existingSalesData = await AsyncStorage.getItem('sales');
    let sales = [];
    
    if (existingSalesData) {
      sales = JSON.parse(existingSalesData);
    }
    
    sales.push(testSale);
    await AsyncStorage.setItem('sales', JSON.stringify(sales));
    console.log('✅ [TEST SALE] Vente sauvegardée dans AsyncStorage');
    
    // 3. Créer des items de vente de test
    const testSaleItems = [
      {
        id: 'test-item-1-' + Date.now(),
        sale_id: testSale.id,
        product_id: 'test-product-1',
        product_name: 'Produit Test 1',
        quantity: 2,
        unit_price: 500,
        total_price: 1000,
      }
    ];
    
    console.log('🧪 [TEST SALE] Items de test créés:', testSaleItems);
    
    // 4. Sauvegarder les items
    const existingSaleItemsData = await AsyncStorage.getItem('sale_items');
    let saleItems = [];
    
    if (existingSaleItemsData) {
      saleItems = JSON.parse(existingSaleItemsData);
    }
    
    saleItems.push(...testSaleItems);
    await AsyncStorage.setItem('sale_items', JSON.stringify(saleItems));
    console.log('✅ [TEST SALE] Items sauvegardés dans AsyncStorage');
    
    // 5. Vérifier que tout est bien sauvegardé
    const salesDataAfter = await AsyncStorage.getItem('sales');
    const saleItemsDataAfter = await AsyncStorage.getItem('sale_items');
    
    if (salesDataAfter) {
      const salesAfter = JSON.parse(salesDataAfter);
      const testSaleFound = salesAfter.find(sale => sale.id === testSale.id);
      
      if (testSaleFound) {
        console.log('✅ [TEST SALE] Vente trouvée après sauvegarde:', testSaleFound);
      } else {
        console.log('❌ [TEST SALE] Vente NON trouvée après sauvegarde');
      }
    }
    
    if (saleItemsDataAfter) {
      const saleItemsAfter = JSON.parse(saleItemsDataAfter);
      const testItemsFound = saleItemsAfter.filter(item => item.sale_id === testSale.id);
      
      console.log('✅ [TEST SALE]', testItemsFound.length, 'items trouvés après sauvegarde');
      testItemsFound.forEach((item, index) => {
        console.log('🛒 [TEST SALE] Item', index + 1, ':', item);
      });
    }
    
    console.log('✅ [TEST SALE] Test terminé !');
    console.log('📋 [TEST SALE] Maintenant, vérifiez l\\'historique des ventes dans l\\'application');
    
  } catch (error) {
    console.error('❌ [TEST SALE] Erreur lors du test:', error);
  }
}

// Exécuter le test
testSaleCreation();
`);
