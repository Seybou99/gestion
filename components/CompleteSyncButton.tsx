import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { checkAndFixFirebaseSync } from '../utils/checkFirebaseSync';
import { forceSyncAllProducts } from '../utils/forceSyncAll';

interface CompleteSyncButtonProps {
  style?: ViewStyle;
}

export const CompleteSyncButton: React.FC<CompleteSyncButtonProps> = ({ style }) => {
  const [loading, setLoading] = useState(false);

  const handleCompleteSync = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 [COMPLETE SYNC] Début synchronisation complète...');
      
      // 1. Forcer la synchronisation de tous les produits pending
      console.log('🔄 [COMPLETE SYNC] Étape 1: Synchronisation forcée...');
      const syncResult = await forceSyncAllProducts();
      
      // 2. Déclencher la synchronisation immédiate
      console.log('🔄 [COMPLETE SYNC] Étape 2: Synchronisation immédiate...');
      const { syncService } = await import('../services/SyncService');
      await syncService.forceSync();
      
      // 3. Vérifier et corriger Firebase
      console.log('🔍 [COMPLETE SYNC] Étape 3: Vérification Firebase...');
      const checkResult = await checkAndFixFirebaseSync();
      
      // 4. Afficher le résultat complet
      const totalLocal = checkResult.local;
      const totalFirebase = checkResult.firebase;
      const fixedCount = checkResult.fixed;
      const syncedPending = syncResult?.addedToQueue || 0;
      
      let message = `✅ Synchronisation complète terminée !\n\n`;
      message += `📦 Produits locaux: ${totalLocal}\n`;
      message += `🌐 Produits Firebase: ${totalFirebase}\n`;
      message += `🔄 Synchronisés: ${syncedPending}\n`;
      message += `🔧 Corrigés: ${fixedCount}\n\n`;
      
      if (totalLocal === totalFirebase) {
        message += `🎉 Parfait ! Tous vos produits sont maintenant dans Firebase !`;
      } else {
        message += `⚠️ Attention: ${totalLocal - totalFirebase} produits manquants détectés.`;
      }
      
      Alert.alert(
        'Synchronisation Complète',
        message,
        [{ text: 'OK' }]
      );
      
      console.log('✅ [COMPLETE SYNC] Synchronisation complète terminée avec succès');
      
    } catch (error) {
      console.error('❌ [COMPLETE SYNC] Erreur synchronisation complète:', error);
      Alert.alert(
        'Erreur',
        `❌ Erreur lors de la synchronisation complète: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
      onPress={handleCompleteSync}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? '🔄 Synchronisation...' : '🚀 Sync Complet'}
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
    backgroundColor: '#6f42c1', // Violet pour le sync complet
  },
  loadingButton: {
    backgroundColor: '#8e44ad', // Violet plus clair quand loading
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
