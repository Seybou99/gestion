// Script pour diagnostiquer les ventes en utilisant les services de l'application
const { DatabaseService } = require('../services/DatabaseService');

async function debugSalesApp() {
  try {
    console.log('🔍 [DEBUG SALES] Début du diagnostic avec DatabaseService...');
    
    // Initialiser le service de base de données
    const databaseService = new DatabaseService();
    await databaseService.init();
    
    // 1. Vérifier les ventes
    console.log('\n📊 [DEBUG SALES] 1. Vérification des ventes...');
    const sales = await databaseService.query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 10');
    console.log(`✅ [DEBUG SALES] ${sales.length} ventes trouvées`);
    
    sales.forEach((sale, index) => {
      console.log(`\n📋 [DEBUG SALES] Vente ${index + 1}:`);
      console.log(`   ID: ${sale.id}`);
      console.log(`   User ID: ${sale.user_id}`);
      console.log(`   Created By: ${sale.created_by}`);
      console.log(`   Montant: ${sale.total_amount} FCFA`);
      console.log(`   Date: ${sale.sale_date}`);
      console.log(`   Sync Status: ${sale.sync_status}`);
    });
    
    // 2. Vérifier les items de vente
    console.log('\n📦 [DEBUG SALES] 2. Vérification des items de vente...');
    const saleItems = await databaseService.query('SELECT * FROM sale_items ORDER BY id DESC LIMIT 20');
    console.log(`✅ [DEBUG SALES] ${saleItems.length} items de vente trouvés`);
    
    saleItems.forEach((item, index) => {
      console.log(`\n🛒 [DEBUG SALES] Item ${index + 1}:`);
      console.log(`   Sale ID: ${item.sale_id}`);
      console.log(`   Product ID: ${item.product_id}`);
      console.log(`   Product Name: ${item.product_name || 'N/A'}`);
      console.log(`   Quantité: ${item.quantity}`);
      console.log(`   Prix unitaire: ${item.unit_price} FCFA`);
      console.log(`   Prix total: ${item.total_price} FCFA`);
    });
    
    // 3. Vérifier les produits
    console.log('\n📦 [DEBUG SALES] 3. Vérification des produits...');
    const products = await databaseService.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 5');
    console.log(`✅ [DEBUG SALES] ${products.length} produits trouvés`);
    
    products.forEach((product, index) => {
      console.log(`\n📦 [DEBUG SALES] Produit ${index + 1}:`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Nom: ${product.name}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Prix: ${product.price_sell} FCFA`);
      console.log(`   Created By: ${product.created_by}`);
    });
    
    // 4. Vérifier le stock
    console.log('\n📊 [DEBUG SALES] 4. Vérification du stock...');
    const stock = await databaseService.query('SELECT * FROM stock ORDER BY updated_at DESC LIMIT 5');
    console.log(`✅ [DEBUG SALES] ${stock.length} entrées de stock trouvées`);
    
    stock.forEach((item, index) => {
      console.log(`\n📊 [DEBUG SALES] Stock ${index + 1}:`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Product ID: ${item.product_id}`);
      console.log(`   Quantité: ${item.quantity_current}`);
      console.log(`   Created By: ${item.created_by}`);
      console.log(`   Sync Status: ${item.sync_status}`);
      console.log(`   Dernière mise à jour: ${item.updated_at}`);
    });
    
    console.log('\n✅ [DEBUG SALES] Diagnostic terminé !');
    
  } catch (error) {
    console.error('❌ [DEBUG SALES] Erreur lors du diagnostic:', error);
  }
}

// Exécuter le diagnostic
debugSalesApp();
