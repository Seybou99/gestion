// Utilitaire pour gérer la correspondance entre IDs locaux et Firebase
import { databaseService } from '../services/DatabaseService';

export const getFirebaseId = async (localId: string): Promise<string | null> => {
  try {
    console.log('🔍 [ID MAPPER] Recherche Firebase ID pour:', localId);
    
    // Forcer l'invalidation du cache pour toutes les tables
    databaseService.invalidateCache('products');
    databaseService.invalidateCache('customers');
    databaseService.invalidateCache('categories');
    databaseService.invalidateCache('stock');
    
    // Chercher dans les produits
    const products = await databaseService.getAll('products');
    const product = products.find((p: any) => p.id === localId);
    
    if (product && product.firebase_id) {
      console.log('✅ [ID MAPPER] Firebase ID trouvé dans products:', product.firebase_id);
      return product.firebase_id;
    }
    
    // Chercher dans les clients
    const customers = await databaseService.getAll('customers');
    const customer = customers.find((c: any) => c.id === localId);
    
    if (customer) {
      console.log('🔍 [ID MAPPER] Client trouvé:', { id: customer.id, name: customer.name, firebase_id: customer.firebase_id });
      if (customer.firebase_id) {
        console.log('✅ [ID MAPPER] Firebase ID trouvé dans customers:', customer.firebase_id);
        return customer.firebase_id;
      }
    }
    
    // Chercher dans les catégories
    const categories = await databaseService.getAll('categories');
    const category = categories.find((c: any) => c.id === localId);
    
    if (category && category.firebase_id) {
      console.log('✅ [ID MAPPER] Firebase ID trouvé dans categories:', category.firebase_id);
      return category.firebase_id;
    }
    
    // Chercher dans le stock
    const stock = await databaseService.getAll('stock');
    const stockItem = stock.find((s: any) => s.id === localId);
    
    if (stockItem && stockItem.firebase_id) {
      console.log('✅ [ID MAPPER] Firebase ID trouvé dans stock:', stockItem.firebase_id);
      return stockItem.firebase_id;
    }
    
    console.log('⚠️ [ID MAPPER] Aucun Firebase ID trouvé pour:', localId);
    return null;
  } catch (error) {
    console.error('❌ [ID MAPPER] Erreur recherche Firebase ID:', error);
    return null;
  }
};

export const getLocalId = async (firebaseId: string): Promise<string | null> => {
  try {
    console.log('🔍 [ID MAPPER] Recherche Local ID pour:', firebaseId);
    
    // Chercher dans les produits
    const products = await databaseService.getAll('products');
    const product = products.find((p: any) => p.firebase_id === firebaseId);
    
    if (product && product.id) {
      console.log('✅ [ID MAPPER] Local ID trouvé dans products:', product.id);
      return product.id;
    }
    
    // Chercher dans les clients
    const customers = await databaseService.getAll('customers');
    const customer = customers.find((c: any) => c.firebase_id === firebaseId);
    
    if (customer && customer.id) {
      console.log('✅ [ID MAPPER] Local ID trouvé dans customers:', customer.id);
      return customer.id;
    }
    
    // Chercher dans les catégories
    const categories = await databaseService.getAll('categories');
    const category = categories.find((c: any) => c.firebase_id === firebaseId);
    
    if (category && category.id) {
      console.log('✅ [ID MAPPER] Local ID trouvé dans categories:', category.id);
      return category.id;
    }
    
    // Chercher dans le stock
    const stock = await databaseService.getAll('stock');
    const stockItem = stock.find((s: any) => s.firebase_id === firebaseId);
    
    if (stockItem && stockItem.id) {
      console.log('✅ [ID MAPPER] Local ID trouvé dans stock:', stockItem.id);
      return stockItem.id;
    }
    
    console.log('⚠️ [ID MAPPER] Aucun Local ID trouvé pour:', firebaseId);
    return null;
  } catch (error) {
    console.error('❌ [ID MAPPER] Erreur recherche Local ID:', error);
    return null;
  }
};

export const isValidFirebaseId = (id: string): boolean => {
  // Les IDs Firebase sont généralement plus longs et ne commencent pas par "id-"
  return !id.startsWith('id-') && id.length > 10;
};

export const isValidLocalId = (id: string): boolean => {
  // Les IDs locaux commencent par "id-"
  return id.startsWith('id-');
};
