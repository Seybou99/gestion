// Utilitaires pour éviter les doublons lors de la synchronisation
import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';

/**
 * Vérifier si un produit existe déjà par SKU ou nom
 */
export const checkProductExists = async (productData: {
  sku?: string;
  name: string;
  barcode?: string;
}): Promise<{ exists: boolean; existingProduct?: any; reason?: string }> => {
  try {
    // 1. Vérifier par SKU (le plus fiable)
    if (productData.sku) {
      const existingBySku = await databaseService.query(
        'SELECT * FROM products WHERE sku = ?',
        [productData.sku]
      );
      if (existingBySku.length > 0) {
        return {
          exists: true,
          existingProduct: existingBySku[0],
          reason: 'SKU déjà existant'
        };
      }
    }

    // 2. Vérifier par code-barres
    if (productData.barcode) {
      const existingByBarcode = await databaseService.query(
        'SELECT * FROM products WHERE barcode = ?',
        [productData.barcode]
      );
      if (existingByBarcode.length > 0) {
        return {
          exists: true,
          existingProduct: existingByBarcode[0],
          reason: 'Code-barres déjà existant'
        };
      }
    }

    // 3. Vérifier par nom exact (moins fiable mais utile)
    const existingByName = await databaseService.query(
      'SELECT * FROM products WHERE LOWER(name) = LOWER(?)',
      [productData.name]
    );
    if (existingByName.length > 0) {
      return {
        exists: true,
        existingProduct: existingByName[0],
        reason: 'Nom déjà existant'
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('❌ [DUPLICATE CHECK] Erreur vérification doublons:', error);
    return { exists: false };
  }
};

/**
 * Vérifier si un produit existe dans Firebase
 */
export const checkProductExistsInFirebase = async (productData: {
  sku?: string;
  name: string;
  barcode?: string;
}): Promise<{ exists: boolean; existingProduct?: any; reason?: string }> => {
  try {
    const firebaseProducts = await firebaseService.getProducts();
    
    // 1. Vérifier par SKU
    if (productData.sku) {
      const existingBySku = firebaseProducts.find(p => p.sku === productData.sku);
      if (existingBySku) {
        return {
          exists: true,
          existingProduct: existingBySku,
          reason: 'SKU déjà existant dans Firebase'
        };
      }
    }

    // 2. Vérifier par code-barres
    if (productData.barcode) {
      const existingByBarcode = firebaseProducts.find(p => p.barcode === productData.barcode);
      if (existingByBarcode) {
        return {
          exists: true,
          existingProduct: existingByBarcode,
          reason: 'Code-barres déjà existant dans Firebase'
        };
      }
    }

    // 3. Vérifier par nom exact
    const existingByName = firebaseProducts.find(p => 
      p.name.toLowerCase() === productData.name.toLowerCase()
    );
    if (existingByName) {
      return {
        exists: true,
        existingProduct: existingByName,
        reason: 'Nom déjà existant dans Firebase'
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('❌ [FIREBASE DUPLICATE CHECK] Erreur vérification doublons Firebase:', error);
    return { exists: false };
  }
};

/**
 * Nettoyer les doublons existants dans la base locale
 */
export const cleanDuplicateProducts = async (): Promise<{
  duplicatesFound: number;
  duplicatesRemoved: number;
  duplicates: Array<{ id: string; name: string; sku: string; reason: string }>;
}> => {
  try {
    console.log('🧹 [CLEAN DUPLICATES] Début du nettoyage des doublons...');
    
    const allProducts = await databaseService.getAll('products');
    const duplicates: Array<{ id: string; name: string; sku: string; reason: string }> = [];
    const toRemove: string[] = [];
    
    // Grouper par SKU
    const skuGroups = new Map<string, any[]>();
    for (const product of allProducts) {
      if (product.sku) {
        if (!skuGroups.has(product.sku)) {
          skuGroups.set(product.sku, []);
        }
        skuGroups.get(product.sku)!.push(product);
      }
    }
    
    // Identifier les doublons par SKU
    for (const [sku, products] of skuGroups) {
      if (products.length > 1) {
        // Garder le plus récent, marquer les autres pour suppression
        const sorted = products.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        for (let i = 1; i < sorted.length; i++) {
          duplicates.push({
            id: sorted[i].id,
            name: sorted[i].name,
            sku: sorted[i].sku,
            reason: `Doublon SKU: ${sku}`
          });
          toRemove.push(sorted[i].id);
        }
      }
    }
    
    // Grouper par nom (si pas de SKU)
    const nameGroups = new Map<string, any[]>();
    for (const product of allProducts) {
      if (!product.sku) {
        const nameKey = product.name.toLowerCase();
        if (!nameGroups.has(nameKey)) {
          nameGroups.set(nameKey, []);
        }
        nameGroups.get(nameKey)!.push(product);
      }
    }
    
    // Identifier les doublons par nom
    for (const [name, products] of nameGroups) {
      if (products.length > 1) {
        // Garder le plus récent, marquer les autres pour suppression
        const sorted = products.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        for (let i = 1; i < sorted.length; i++) {
          duplicates.push({
            id: sorted[i].id,
            name: sorted[i].name,
            sku: sorted[i].sku || 'N/A',
            reason: `Doublon nom: ${name}`
          });
          toRemove.push(sorted[i].id);
        }
      }
    }
    
    // Supprimer les doublons
    let removedCount = 0;
    for (const id of toRemove) {
      try {
        await databaseService.delete('products', id);
        removedCount++;
        console.log(`🗑️ [CLEAN DUPLICATES] Doublon supprimé: ${id}`);
      } catch (error) {
        console.error(`❌ [CLEAN DUPLICATES] Erreur suppression ${id}:`, error);
      }
    }
    
    console.log(`✅ [CLEAN DUPLICATES] Nettoyage terminé: ${duplicates.length} doublons trouvés, ${removedCount} supprimés`);
    
    return {
      duplicatesFound: duplicates.length,
      duplicatesRemoved: removedCount,
      duplicates
    };
  } catch (error) {
    console.error('❌ [CLEAN DUPLICATES] Erreur nettoyage doublons:', error);
    throw error;
  }
};

/**
 * Synchroniser Firebase → Local en évitant les doublons
 */
export const syncFirebaseToLocalSafe = async (): Promise<{
  productsDownloaded: number;
  stocksDownloaded: number;
  duplicatesSkipped: number;
  totalProducts: number;
  totalStocks: number;
}> => {
  try {
    console.log('📥 [SYNC SAFE] Début du téléchargement sécurisé Firebase → Local...');

    // Vérifier si l'utilisateur est connecté (mode production)
    const { getCurrentUser } = await import('./userInfo');
    const user = await getCurrentUser();
    if (!user) {
      console.log('👤 [SYNC SAFE] Utilisateur non connecté, synchronisation ignorée (mode production)');
      throw new Error('Utilisateur non connecté');
    }

    // 1. Récupérer les produits depuis Firebase
    const firebaseProducts = await firebaseService.getProducts();
    console.log(`📦 [SYNC SAFE] ${firebaseProducts.length} produits trouvés dans Firebase`);

    // 2. Récupérer les stocks depuis Firebase
    const firebaseStocks = await firebaseService.getStock();
    console.log(`📊 [SYNC SAFE] ${firebaseStocks.length} stocks trouvés dans Firebase`);

    // 3. Récupérer les produits existants localement
    const localProducts = await databaseService.getAll('products');
    const localProductIds = new Set(localProducts.map(p => p.id));
    
    // 4. Sauvegarder chaque produit localement (avec vérification doublons)
    let productsAdded = 0;
    let duplicatesSkipped = 0;
    
    for (const product of firebaseProducts) {
      try {
        // Vérifier si le produit existe déjà par ID
        if (localProductIds.has(product.id)) {
          console.log(`⏭️ [SYNC SAFE] Produit "${product.name}" existe déjà (ID)`);
          continue;
        }
        
        // Vérifier les doublons par SKU/nom
        const duplicateCheck = await checkProductExists({
          sku: product.sku,
          name: product.name,
          barcode: product.barcode
        });
        
        if (duplicateCheck.exists) {
          console.log(`⚠️ [SYNC SAFE] Doublon détecté "${product.name}": ${duplicateCheck.reason}`);
          duplicatesSkipped++;
          continue;
        }
        
        // Créer le produit localement
        await databaseService.insert('products', {
          ...product,
          created_at: product.created_at,
          updated_at: product.updated_at,
          sync_status: 'synced',
        });
        console.log(`✅ [SYNC SAFE] Produit "${product.name}" téléchargé`);
        productsAdded++;
        
      } catch (error) {
        console.error(`❌ [SYNC SAFE] Erreur produit "${product.name}":`, error);
      }
    }

    // 5. Récupérer les stocks existants localement
    const localStocks = await databaseService.getAll('stock');
    const localStockIds = new Set(localStocks.map(s => s.id));
    
    // 6. Sauvegarder chaque stock localement
    let stocksAdded = 0;
    for (const stock of firebaseStocks) {
      try {
        if (!localStockIds.has(stock.id)) {
          await databaseService.insert('stock', {
            ...stock,
            created_at: stock.created_at,
            updated_at: stock.updated_at,
            sync_status: 'synced',
          });
          console.log(`✅ [SYNC SAFE] Stock pour produit "${stock.product_id}" téléchargé`);
          stocksAdded++;
        } else {
          console.log(`⏭️ [SYNC SAFE] Stock pour produit "${stock.product_id}" existe déjà`);
        }
      } catch (error) {
        console.error(`❌ [SYNC SAFE] Erreur stock "${stock.product_id}":`, error);
      }
    }

    console.log('✅ [SYNC SAFE] Téléchargement sécurisé terminé !');
    return {
      productsDownloaded: productsAdded,
      stocksDownloaded: stocksAdded,
      duplicatesSkipped,
      totalProducts: firebaseProducts.length,
      totalStocks: firebaseStocks.length,
    };
  } catch (error) {
    console.error('❌ [SYNC SAFE] Erreur générale:', error);
    throw error;
  }
};
