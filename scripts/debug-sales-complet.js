const AsyncStorage = require("@react-native-async-storage/async-storage");

async function debugSalesComplet() {
  try {
    console.log('🔍 [DEBUG SALES] Début du diagnostic complet des ventes...');
    
    // 1. Vérifier les ventes dans AsyncStorage
    console.log('\n📊 [DEBUG SALES] 1. Vérification AsyncStorage...');
    const salesData = await AsyncStorage.getItem("sales");
    if (salesData) {
      const sales = JSON.parse(salesData);
      console.log(`✅ [DEBUG SALES] ${sales.length} ventes trouvées dans AsyncStorage`);
      
      sales.forEach((sale, index) => {
        console.log(`\n📋 [DEBUG SALES] Vente ${index + 1}:`);
        console.log(`   ID: ${sale.id}`);
        console.log(`   User ID: ${sale.user_id}`);
        console.log(`   Created By: ${sale.created_by}`);
        console.log(`   Montant: ${sale.total_amount} FCFA`);
        console.log(`   Date: ${sale.sale_date}`);
        console.log(`   Sync Status: ${sale.sync_status}`);
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucune donnée de ventes dans AsyncStorage');
    }
    
    // 2. Vérifier les items de vente
    console.log('\n📦 [DEBUG SALES] 2. Vérification des items de vente...');
    const saleItemsData = await AsyncStorage.getItem("sale_items");
    if (saleItemsData) {
      const saleItems = JSON.parse(saleItemsData);
      console.log(`✅ [DEBUG SALES] ${saleItems.length} items de vente trouvés`);
      
      saleItems.forEach((item, index) => {
        console.log(`\n🛒 [DEBUG SALES] Item ${index + 1}:`);
        console.log(`   Sale ID: ${item.sale_id}`);
        console.log(`   Product ID: ${item.product_id}`);
        console.log(`   Product Name: ${item.product_name}`);
        console.log(`   Quantité: ${item.quantity}`);
        console.log(`   Prix unitaire: ${item.unit_price} FCFA`);
        console.log(`   Prix total: ${item.total_price} FCFA`);
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucun item de vente trouvé');
    }
    
    // 3. Vérifier la queue de synchronisation
    console.log('\n🔄 [DEBUG SALES] 3. Vérification de la queue de synchronisation...');
    const syncQueueData = await AsyncStorage.getItem("sync_queue");
    if (syncQueueData) {
      const syncQueue = JSON.parse(syncQueueData);
      const salesInQueue = syncQueue.filter(item => item.table === 'sales');
      console.log(`✅ [DEBUG SALES] ${salesInQueue.length} ventes dans la queue de synchronisation`);
      
      salesInQueue.forEach((item, index) => {
        console.log(`\n🔄 [DEBUG SALES] Queue Item ${index + 1}:`);
        console.log(`   Table: ${item.table}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Operation: ${item.operation}`);
        console.log(`   User ID: ${item.data.user_id}`);
        console.log(`   Created By: ${item.data.created_by}`);
        console.log(`   Montant: ${item.data.total_amount} FCFA`);
      });
    } else {
      console.log('❌ [DEBUG SALES] Aucune queue de synchronisation trouvée');
    }
    
    // 4. Vérifier les données de produits
    console.log('\n📦 [DEBUG SALES] 4. Vérification des produits...');
    const productsData = await AsyncStorage.getItem("products");
    if (productsData) {
      const products = JSON.parse(productsData);
      console.log(`✅ [DEBUG SALES] ${products.length} produits trouvés`);
      
      // Afficher les 3 premiers produits
      products.slice(0, 3).forEach((product, index) => {
        console.log(`\n📦 [DEBUG SALES] Produit ${index + 1}:`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Nom: ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   Prix: ${product.price_sell} FCFA`);
        console.log(`   Created By: ${product.created_by}`);
      });
    }
    
    // 5. Vérifier le stock
    console.log('\n📊 [DEBUG SALES] 5. Vérification du stock...');
    const stockData = await AsyncStorage.getItem("stock");
    if (stockData) {
      const stock = JSON.parse(stockData);
      console.log(`✅ [DEBUG SALES] ${stock.length} entrées de stock trouvées`);
      
      // Afficher les 3 premières entrées
      stock.slice(0, 3).forEach((item, index) => {
        console.log(`\n📊 [DEBUG SALES] Stock ${index + 1}:`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Product ID: ${item.product_id}`);
        console.log(`   Quantité: ${item.quantity_current}`);
        console.log(`   Created By: ${item.created_by}`);
        console.log(`   Sync Status: ${item.sync_status}`);
      });
    }
    
    console.log('\n✅ [DEBUG SALES] Diagnostic terminé !');
    
  } catch (error) {
    console.error('❌ [DEBUG SALES] Erreur lors du diagnostic:', error);
  }
}

// Exécuter le diagnostic
debugSalesComplet();
