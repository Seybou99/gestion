/**
 * Script JavaScript à exécuter dans la console de l'app
 * pour nettoyer les stocks orphelins
 * 
 * Copiez-collez ce code dans la console de votre app React Native
 */

async function cleanOrphanStocks() {
  try {
    console.log('🧹 [CLEANUP] Début du nettoyage des stocks orphelins...');
    
    // 1. Récupérer tous les produits
    const productsData = await AsyncStorage.getItem('products');
    const products = productsData ? JSON.parse(productsData) : [];
    console.log(`📦 [CLEANUP] ${products.length} produits trouvés`);
    
    // 2. Récupérer tous les stocks
    const stockData = await AsyncStorage.getItem('stock');
    const stocks = stockData ? JSON.parse(stockData) : [];
    console.log(`📊 [CLEANUP] ${stocks.length} stocks trouvés`);
    
    // 3. Créer un Set des IDs de produits valides
    const validProductIds = new Set(products.map(p => p.id));
    console.log(`✅ [CLEANUP] ${validProductIds.size} IDs de produits valides`);
    
    // 4. Identifier les stocks orphelins
    const orphanStocks = stocks.filter(stock => !validProductIds.has(stock.product_id));
    console.log(`🔍 [CLEANUP] ${orphanStocks.length} stocks orphelins identifiés`);
    
    if (orphanStocks.length === 0) {
      console.log('✅ [CLEANUP] Aucun stock orphelin trouvé !');
      return;
    }
    
    // 5. Afficher les détails des stocks orphelins
    console.log('\n📋 [CLEANUP] Stocks orphelins détectés :');
    orphanStocks.forEach((stock, index) => {
      console.log(`  ${index + 1}. Stock ID: ${stock.id}`);
      console.log(`     Product ID: ${stock.product_id} (N'EXISTE PAS)`);
      console.log(`     Quantité: ${stock.quantity_current}`);
      console.log(`     Créé par: ${stock.created_by_name || 'Inconnu'}`);
      console.log('');
    });
    
    // 6. Supprimer les stocks orphelins
    const validStocks = stocks.filter(stock => validProductIds.has(stock.product_id));
    await AsyncStorage.setItem('stock', JSON.stringify(validStocks));
    
    console.log(`🗑️ [CLEANUP] ${orphanStocks.length} stocks orphelins supprimés`);
    console.log(`✅ [CLEANUP] ${validStocks.length} stocks valides conservés`);
    
    // 7. Vérification finale
    const finalStockData = await AsyncStorage.getItem('stock');
    const finalStocks = finalStockData ? JSON.parse(finalStockData) : [];
    console.log(`🔍 [CLEANUP] Vérification finale : ${finalStocks.length} stocks restants`);
    
    // Vérifier qu'il n'y a plus d'orphelins
    const remainingOrphans = finalStocks.filter(stock => !validProductIds.has(stock.product_id));
    if (remainingOrphans.length === 0) {
      console.log('✅ [CLEANUP] Nettoyage réussi ! Aucun stock orphelin restant.');
    } else {
      console.log(`❌ [CLEANUP] ERREUR : ${remainingOrphans.length} stocks orphelins restants !`);
    }
    
    // 8. Invalider le cache pour forcer le rechargement
    const { databaseService } = await import('./services/DatabaseService');
    databaseService.invalidateCache('stock');
    console.log('🗑️ [CLEANUP] Cache invalidé pour forcer le rechargement');
    
  } catch (error) {
    console.error('❌ [CLEANUP] Erreur lors du nettoyage:', error);
  }
}

// Exécuter le script
cleanOrphanStocks();
