// Utilitaire pour synchroniser Firebase → AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';

/**
 * Télécharger toutes les catégories depuis Firebase
 * et les sauvegarder dans AsyncStorage local
 * Protection contre les doublons incluse
 */
export const syncCategoriesToLocal = async () => {
  try {
    console.log('📥 [SYNC CATEGORIES] Début du téléchargement des catégories Firebase → Local...');

    // 1. Récupérer les catégories depuis Firebase
    const firebaseCategories = await firebaseService.getCategories();
    console.log(`📂 [SYNC CATEGORIES] ${firebaseCategories.length} catégories trouvées dans Firebase`);

    // 2. Récupérer les catégories existantes localement
    const localCategories = await databaseService.getAll('categories') as any[];
    
    // 3. Créer un Map des catégories locales par firebase_id et id local
    const localCategoriesByFirebaseId = new Map();
    const localCategoriesById = new Map();
    
    localCategories.forEach(cat => {
      if (cat.firebase_id) {
        localCategoriesByFirebaseId.set(cat.firebase_id, cat);
      }
      localCategoriesById.set(cat.id, cat);
    });
    
    console.log(`📂 [SYNC CATEGORIES] ${localCategories.length} catégories locales existantes`);
    
    // 4. Sauvegarder chaque catégorie Firebase localement
    let categoriesAdded = 0;
    let categoriesUpdated = 0;
    let categoriesSkipped = 0;
    
    for (const firebaseCategory of firebaseCategories) {
      try {
        // Vérifier si la catégorie existe déjà localement (par firebase_id ou id)
        const existingByFirebaseId = localCategoriesByFirebaseId.get(firebaseCategory.id);
        const existingById = localCategoriesById.get(firebaseCategory.id);
        
        if (existingByFirebaseId || existingById) {
          // La catégorie existe déjà
          const existing = existingByFirebaseId || existingById;
          
          // Si la catégorie locale est en attente de sync, ne pas l'écraser
          if (existing.sync_status === 'pending') {
            console.log(`⏭️ [SYNC CATEGORIES] Catégorie "${firebaseCategory.name}" en attente de sync, non écrasée`);
            categoriesSkipped++;
            continue;
          }
          
          // Mettre à jour la catégorie locale avec les données Firebase
          await databaseService.update('categories', existing.id, {
            name: firebaseCategory.name,
            description: firebaseCategory.description,
            color: firebaseCategory.color,
            icon: firebaseCategory.icon,
            is_active: firebaseCategory.is_active,
            firebase_id: firebaseCategory.id,
            updated_at: firebaseCategory.updated_at || new Date().toISOString(),
            sync_status: 'synced',
          });
          console.log(`🔄 [SYNC CATEGORIES] Catégorie "${firebaseCategory.name}" mise à jour`);
          categoriesUpdated++;
        } else {
          // Nouvelle catégorie, l'ajouter localement
          const existing = await AsyncStorage.getItem('categories');
          const items = existing ? JSON.parse(existing) : [];
          
          // Vérifier une dernière fois les doublons par nom
          const duplicateByName = items.find((cat: any) => 
            cat.name.toLowerCase().trim() === firebaseCategory.name.toLowerCase().trim()
          );
          
          if (duplicateByName) {
            // Mettre à jour le doublon existant avec l'ID Firebase
            await databaseService.update('categories', duplicateByName.id, {
              firebase_id: firebaseCategory.id,
              sync_status: 'synced',
              updated_at: firebaseCategory.updated_at || new Date().toISOString(),
            });
            console.log(`🔗 [SYNC CATEGORIES] Catégorie "${firebaseCategory.name}" liée à Firebase ID`);
            categoriesUpdated++;
          } else {
            // Créer la nouvelle catégorie avec l'ID Firebase comme ID local
            items.push({
              id: firebaseCategory.id, // Utiliser l'ID Firebase comme ID local
              name: firebaseCategory.name,
              description: firebaseCategory.description,
              color: firebaseCategory.color,
              icon: firebaseCategory.icon,
              is_active: firebaseCategory.is_active,
              firebase_id: firebaseCategory.id,
              created_at: firebaseCategory.created_at || new Date().toISOString(),
              updated_at: firebaseCategory.updated_at || new Date().toISOString(),
              sync_status: 'synced',
            });
            await AsyncStorage.setItem('categories', JSON.stringify(items));
            
            // Invalider le cache
            databaseService.invalidateCache('categories');
            
            console.log(`✅ [SYNC CATEGORIES] Catégorie "${firebaseCategory.name}" téléchargée`);
            categoriesAdded++;
          }
        }
      } catch (error) {
        console.error(`❌ [SYNC CATEGORIES] Erreur catégorie "${firebaseCategory.name}":`, error);
      }
    }

    console.log('✅ [SYNC CATEGORIES] Téléchargement des catégories terminé !');
    console.log(`📊 [SYNC CATEGORIES] Ajoutées: ${categoriesAdded}, Mises à jour: ${categoriesUpdated}, Ignorées: ${categoriesSkipped}`);
    
    return {
      categoriesAdded,
      categoriesUpdated,
      categoriesSkipped,
      totalCategories: firebaseCategories.length,
    };
  } catch (error) {
    console.error('❌ [SYNC CATEGORIES] Erreur générale:', error);
    throw error;
  }
};

/**
 * Télécharger tous les produits et stocks depuis Firebase
 * et les sauvegarder dans AsyncStorage local
 */
export const syncFirebaseToLocal = async () => {
  try {
    console.log('📥 [SYNC DOWNLOAD] Début du téléchargement Firebase → Local...');

    // 1. Synchroniser les catégories EN PREMIER (car les produits en dépendent)
    let categoriesResult = {
      categoriesAdded: 0,
      categoriesUpdated: 0,
      categoriesSkipped: 0,
      totalCategories: 0,
    };
    
    try {
      categoriesResult = await syncCategoriesToLocal();
    } catch (error) {
      console.error('❌ [SYNC DOWNLOAD] Erreur sync catégories:', error);
      // Continuer même si les catégories échouent
    }

    // 2. Récupérer les produits depuis Firebase
    const firebaseProducts = await firebaseService.getProducts();
    console.log(`📦 [SYNC DOWNLOAD] ${firebaseProducts.length} produits trouvés dans Firebase`);

    // 3. Récupérer les stocks depuis Firebase
    const firebaseStocks = await firebaseService.getStock();
    console.log(`📊 [SYNC DOWNLOAD] ${firebaseStocks.length} stocks trouvés dans Firebase`);

    // 4. Récupérer les produits existants localement
    const localProducts = await databaseService.getAll('products');
    const localProductIds = new Set(localProducts.map(p => p.id));
    
    // 5. Sauvegarder chaque produit localement
    let productsAdded = 0;
    for (const product of firebaseProducts) {
      try {
        if (!localProductIds.has(product.id)) {
          // Créer le produit localement
          await databaseService.insert('products', {
            ...product,
            created_at: product.created_at,
            updated_at: product.updated_at,
            sync_status: 'synced',
          });
          console.log(`✅ [SYNC DOWNLOAD] Produit "${product.name}" téléchargé`);
          productsAdded++;
        } else {
          console.log(`⏭️ [SYNC DOWNLOAD] Produit "${product.name}" existe déjà`);
        }
      } catch (error) {
        console.error(`❌ [SYNC DOWNLOAD] Erreur produit "${product.name}":`, error);
      }
    }

    // 6. Récupérer les stocks existants localement
    const localStocks = await databaseService.getAll('stock');
    const localStockIds = new Set(localStocks.map(s => s.id));
    
    // 7. Sauvegarder chaque stock localement
    let stocksAdded = 0;
    for (const stock of firebaseStocks) {
      try {
        if (!localStockIds.has(stock.id)) {
          // Créer le stock localement
          await databaseService.insert('stock', {
            ...stock,
            created_at: stock.created_at,
            updated_at: stock.updated_at,
            sync_status: 'synced',
          });
          console.log(`✅ [SYNC DOWNLOAD] Stock pour produit "${stock.product_id}" téléchargé`);
          stocksAdded++;
        } else {
          console.log(`⏭️ [SYNC DOWNLOAD] Stock pour produit "${stock.product_id}" existe déjà`);
        }
      } catch (error) {
        console.error(`❌ [SYNC DOWNLOAD] Erreur stock "${stock.product_id}":`, error);
      }
    }

    console.log('✅ [SYNC DOWNLOAD] Téléchargement Firebase → Local terminé !');
    return {
      categoriesAdded: categoriesResult.categoriesAdded,
      categoriesUpdated: categoriesResult.categoriesUpdated,
      categoriesSkipped: categoriesResult.categoriesSkipped,
      totalCategories: categoriesResult.totalCategories,
      productsDownloaded: productsAdded,
      stocksDownloaded: stocksAdded,
      totalProducts: firebaseProducts.length,
      totalStocks: firebaseStocks.length,
    };
  } catch (error) {
    console.error('❌ [SYNC DOWNLOAD] Erreur générale:', error);
    throw error;
  }
};

