// Utilitaire pour gérer la correspondance entre IDs locaux et Firebase
import { databaseService } from '../services/DatabaseService';

export const getFirebaseId = async (localId: string): Promise<string | null> => {
  try {
    console.log('🔍 [ID MAPPER] Recherche Firebase ID pour:', localId);
    
    const products = await databaseService.getAll('products');
    const product = products.find((p: any) => p.id === localId);
    
    if (product && product.firebase_id) {
      console.log('✅ [ID MAPPER] Firebase ID trouvé:', product.firebase_id);
      return product.firebase_id;
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
    
    const products = await databaseService.getAll('products');
    const product = products.find((p: any) => p.firebase_id === firebaseId);
    
    if (product && product.id) {
      console.log('✅ [ID MAPPER] Local ID trouvé:', product.id);
      return product.id;
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
