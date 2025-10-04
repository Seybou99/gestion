import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { forceSyncAllProducts } from '../utils/forceSyncAll';

interface ForceSyncButtonProps {
  style?: ViewStyle;
}

export const ForceSyncButton: React.FC<ForceSyncButtonProps> = ({ style }) => {
  const [loading, setLoading] = useState(false);

  const handleForceSync = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 [BUTTON] Début synchronisation forcée...');
      
      // Forcer la synchronisation de tous les produits
      const result = await forceSyncAllProducts();
      
      // Déclencher la synchronisation immédiate
      const { syncService } = await import('../services/SyncService');
      console.log('🔄 [BUTTON] Déclenchement synchronisation immédiate...');
      await syncService.forceSync();
      
      // Afficher le résultat
      if (result && result.addedToQueue > 0) {
        Alert.alert(
          'Synchronisation Forcée',
          `✅ Synchronisation terminée !\n\n📦 Total produits: ${result.totalLocal}\n⏳ Pending: ${result.pending}\n✅ Déjà sync: ${result.synced}\n📝 Ajoutés à la queue: ${result.addedToQueue}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Synchronisation Forcée',
          `ℹ️ Aucune synchronisation nécessaire !\n\n📦 Total produits: ${result.totalLocal}\n⏳ Pending: ${result.pending}\n✅ Déjà sync: ${result.synced}\n📝 Ajoutés à la queue: ${result.addedToQueue}\n\nTous vos produits sont déjà synchronisés !`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ [BUTTON] Erreur synchronisation forcée:', error);
      Alert.alert(
        'Erreur',
        `❌ Erreur lors de la synchronisation forcée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        loading ? styles.loadingButton : styles.normalButton,
        style,
      ]}
      onPress={handleForceSync}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? '🔄 Synchronisation...' : '🚀 Forcer Sync Tous'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  normalButton: {
    backgroundColor: '#FF6B35', // Orange vif pour attirer l'attention
  },
  loadingButton: {
    backgroundColor: '#FFA500', // Orange plus clair quand loading
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
