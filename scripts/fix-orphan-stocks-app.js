/**
 * Script à exécuter dans la console de l'app pour corriger les stocks orphelins
 * Ce script va supprimer les stocks qui référencent des produits inexistants
 */

async function fixOrphanStocks() {
  try {
    console.log('🔧 [FIX ORPHAN] Début de la correction des stocks orphelins...');
    
    // 1. Récupérer les données
    const productsData = await AsyncStorage.getItem('products');
    const products = productsData ? JSON.parse(productsData) : [];
    console.log(`📦 [FIX ORPHAN] ${products.length} produits trouvés`);
    
    const stockData = await AsyncStorage.getItem('stock');
    const stocks = stockData ? JSON.parse(stockData) : [];
    console.log(`📊 [FIX ORPHAN] ${stocks.length} stocks trouvés`);
    
    // 2. Identifier les IDs de produits valides
    const validProductIds = new Set(products.map(p => p.id));
    console.log(`✅ [FIX ORPHAN] ${validProductIds.size} IDs de produits valides`);
    
    // 3. Trouver les stocks orphelins
    const orphanStocks = stocks.filter(stock => !validProductIds.has(stock.product_id));
    console.log(`🔍 [FIX ORPHAN] ${orphanStocks.length} stocks orphelins identifiés`);
    
    if (orphanStocks.length === 0) {
      console.log('✅ [FIX ORPHAN] Aucun stock orphelin trouvé !');
      return;
    }
    
    // 4. Afficher les stocks orphelins
    console.log('\n📋 [FIX ORPHAN] Stocks orphelins détectés :');
    orphanStocks.forEach((stock, index) => {
      console.log(`  ${index + 1}. Stock ID: ${stock.id}`);
      console.log(`     Product ID: ${stock.product_id} (N'EXISTE PAS)`);
      console.log(`     Quantité: ${stock.quantity_current}`);
      console.log(`     Créé par: ${stock.created_by_name || 'Inconnu'}`);
      console.log('');
    });
    
    // 5. Supprimer les stocks orphelins
    const validStocks = stocks.filter(stock => validProductIds.has(stock.product_id));
    await AsyncStorage.setItem('stock', JSON.stringify(validStocks));
    console.log(`🗑️ [FIX ORPHAN] ${orphanStocks.length} stocks orphelins supprimés`);
    console.log(`✅ [FIX ORPHAN] ${validStocks.length} stocks valides conservés`);
    
    // 6. Invalider le cache pour forcer le rechargement
    const { databaseService } = await import('./services/DatabaseService');
    databaseService.invalidateCache('stock');
    console.log('🗑️ [FIX ORPHAN] Cache invalidé pour forcer le rechargement');
    
    // 7. Recharger les produits pour voir le changement
    console.log('🔄 [FIX ORPHAN] Rechargement des produits...');
    const { store } = await import('./store/index');
    const { fetchProducts } = await import('./store/slices/productSlice');
    store.dispatch(fetchProducts());
    
    console.log('🎉 [FIX ORPHAN] Correction terminée !');
    
  } catch (error) {
    console.error('❌ [FIX ORPHAN] Erreur lors de la correction:', error);
  }
}

// Exécuter le script
fixOrphanStocks();


