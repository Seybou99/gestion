import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { firebaseService } from '../services/FirebaseService';

interface CleanFirestoreStockButtonProps {
  style?: any;
}

export const CleanFirestoreStockButton: React.FC<CleanFirestoreStockButtonProps> = ({ style }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanOrphanedStock = async () => {
    try {
      setIsLoading(true);
      console.log('🧹 [MANUAL CLEANUP] Démarrage du nettoyage manuel des stocks orphelins...');
      
      // Récupérer tous les stocks depuis Firestore
      const allStocks = await firebaseService.getStock();
      
      if (allStocks.length === 0) {
        Alert.alert('Nettoyage terminé', 'Aucun stock dans Firestore');
        console.log('✅ [MANUAL CLEANUP] Aucun stock dans Firestore');
        return;
      }
      
      console.log(`🔍 [MANUAL CLEANUP] ${allStocks.length} stocks trouvés dans Firestore`);
      
      // Récupérer tous les produits depuis Firestore
      const allProducts = await firebaseService.getProducts();
      const productIds = new Set(allProducts.map(p => p.id));
      
      console.log(`🔍 [MANUAL CLEANUP] ${allProducts.length} produits trouvés dans Firestore`);
      
      // Identifier les stocks orphelins (product_id commence par "id-" ou produit inexistant)
      const orphanedStocks = allStocks.filter(stock => {
        const isLocalId = stock.product_id && stock.product_id.startsWith('id-');
        const productNotExists = stock.product_id && !productIds.has(stock.product_id);
        return isLocalId || productNotExists;
      });
      
      if (orphanedStocks.length === 0) {
        Alert.alert('Nettoyage terminé', 'Aucun stock orphelin détecté ✅');
        console.log('✅ [MANUAL CLEANUP] Aucun stock orphelin détecté');
        return;
      }
      
      console.log(`🗑️ [MANUAL CLEANUP] ${orphanedStocks.length} stocks orphelins détectés`);
      
      // Supprimer chaque stock orphelin
      let deletedCount = 0;
      
      for (const stock of orphanedStocks) {
        try {
          console.log(`🗑️ [MANUAL CLEANUP] Suppression du stock orphelin ${stock.id} (product_id: ${stock.product_id})`);
          await firebaseService.deleteStock(stock.id);
          deletedCount++;
        } catch (error) {
          console.error(`❌ [MANUAL CLEANUP] Erreur suppression stock ${stock.id}:`, error);
        }
      }
      
      const message = `${deletedCount} stock(s) orphelin(s) supprimé(s) de Firestore ✅`;
      Alert.alert('Nettoyage terminé', message);
      console.log(`✅ [MANUAL CLEANUP] ${message}`);
      
    } catch (error) {
      console.error('❌ [MANUAL CLEANUP] Erreur:', error);
      Alert.alert('Erreur', 'Erreur lors du nettoyage des stocks orphelins');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleCleanOrphanedStock}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>
          🧹 Nettoyer stocks Firestore
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

