// Script de test simple pour vérifier l'architecture
const { databaseService, seedTestData } = require('./services/DatabaseService.ts');

async function testApp() {
  try {
    console.log('🧪 Test de l\'architecture de l\'application...');
    
    // 1. Initialiser la base de données
    console.log('1️⃣ Initialisation de la base de données...');
    await databaseService.init();
    
    // 2. Générer des données de test
    console.log('2️⃣ Génération des données de test...');
    await seedTestData();
    
    // 3. Récupérer les produits
    console.log('3️⃣ Récupération des produits...');
    const products = await databaseService.getAll('products');
    console.log(`✅ ${products.length} produits trouvés:`, products.map(p => p.name));
    
    // 4. Récupérer les produits avec stock
    console.log('4️⃣ Récupération des produits avec stock...');
    const productsWithStock = await databaseService.getProductsWithStock();
    console.log(`✅ ${productsWithStock.length} produits avec stock:`, 
      productsWithStock.map(p => `${p.name} (${p.quantity_current} en stock)`));
    
    // 5. Test de recherche
    console.log('5️⃣ Test de recherche...');
    const searchResults = await databaseService.query('SELECT * FROM products WHERE name LIKE ?', ['%iPhone%']);
    console.log(`✅ Recherche iPhone: ${searchResults.length} résultats`);
    
    console.log('🎉 Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test si le script est appelé directement
if (require.main === module) {
  testApp();
}

module.exports = { testApp };
