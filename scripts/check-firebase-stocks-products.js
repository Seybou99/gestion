// Script pour vérifier la cohérence stocks/produits dans Firebase
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkStocksProducts() {
  try {
    console.log('🔍 [CHECK] Vérification stocks/produits dans Firebase...\n');
    
    const USER_UID = 'YeZ6BMBBXxVtwXolZ5j6mh7KK5l2'; // diokolo@gmail.com
    
    // 1. Récupérer tous les produits de l'utilisateur
    console.log('📦 [CHECK] Récupération des produits...');
    const productsSnapshot = await db.collection('products')
      .where('created_by', '==', USER_UID)
      .get();
    
    console.log(`✅ [CHECK] ${productsSnapshot.size} produits trouvés\n`);
    
    const products = {};
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      products[doc.id] = product;
      console.log(`📦 Produit: ${product.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Created by: ${product.created_by}`);
      console.log('');
    });
    
    // 2. Récupérer tous les stocks de l'utilisateur
    console.log('📊 [CHECK] Récupération des stocks...');
    const stocksSnapshot = await db.collection('stock')
      .where('created_by', '==', USER_UID)
      .get();
    
    console.log(`✅ [CHECK] ${stocksSnapshot.size} stocks trouvés\n`);
    
    // 3. Analyser chaque stock
    const stocksByProduct = {};
    const orphanStocks = [];
    
    stocksSnapshot.forEach(doc => {
      const stock = doc.data();
      const productId = stock.product_id;
      
      console.log(`📊 Stock ID: ${doc.id}`);
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantité: ${stock.quantity_current}`);
      
      // Vérifier si le produit existe
      if (products[productId]) {
        console.log(`   ✅ Produit trouvé: ${products[productId].name}`);
        
        // Compter les stocks par produit
        if (!stocksByProduct[productId]) {
          stocksByProduct[productId] = [];
        }
        stocksByProduct[productId].push(doc.id);
      } else {
        console.log(`   ❌ Produit INTROUVABLE`);
        orphanStocks.push({
          stockId: doc.id,
          productId: productId,
          quantity: stock.quantity_current,
          created_by: stock.created_by
        });
      }
      console.log('');
    });
    
    // 4. Afficher les duplications de stock
    console.log('\n🔍 [CHECK] Analyse des duplications de stock :');
    for (const [productId, stockIds] of Object.entries(stocksByProduct)) {
      if (stockIds.length > 1) {
        console.log(`⚠️ DUPLICATION: ${stockIds.length} stocks pour le produit ${products[productId]?.name || productId}`);
        stockIds.forEach((stockId, index) => {
          console.log(`   ${index + 1}. Stock ID: ${stockId}`);
        });
        console.log('');
      }
    }
    
    // 5. Afficher les stocks orphelins
    if (orphanStocks.length > 0) {
      console.log('\n⚠️ [CHECK] Stocks orphelins (sans produit correspondant) :');
      orphanStocks.forEach((stock, index) => {
        console.log(`  ${index + 1}. Stock ID: ${stock.stockId}`);
        console.log(`     Product ID: ${stock.productId} (INTROUVABLE)`);
        console.log(`     Quantité: ${stock.quantity}`);
        console.log(`     Created by: ${stock.created_by}`);
        console.log('');
      });
      
      console.log('\n🔧 [CHECK] RECOMMANDATION :');
      console.log('   Ces stocks orphelins devraient être supprimés.');
      console.log('   Utilisez le script clean-orphan-stocks.js pour les supprimer.');
    }
    
    // 6. Résumé
    console.log('\n📊 [CHECK] RÉSUMÉ :');
    console.log(`   Produits: ${productsSnapshot.size}`);
    console.log(`   Stocks: ${stocksSnapshot.size}`);
    console.log(`   Stocks orphelins: ${orphanStocks.length}`);
    
    const duplicatedProducts = Object.values(stocksByProduct).filter(stocks => stocks.length > 1).length;
    console.log(`   Produits avec stocks dupliqués: ${duplicatedProducts}`);
    
    console.log('\n✅ [CHECK] Diagnostic terminé');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ [CHECK] Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le diagnostic
checkStocksProducts();
