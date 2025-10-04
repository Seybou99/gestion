import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FORCE_OFFLINE_MODE, setOfflineMode } from '../services/firebase-config';
import { forceSyncAllPendingArticles } from '../utils/syncOfflineData';

interface NetworkTestButtonProps {
  style?: any;
}

export const NetworkTestButton: React.FC<NetworkTestButtonProps> = ({ style }) => {
  const handleToggleNetwork = async () => {
    const newMode = !FORCE_OFFLINE_MODE;
    setOfflineMode(newMode);
    
    // Si on passe en mode ONLINE, synchroniser les articles offline
    if (!newMode) {
      console.log('🔄 [TEST] Passage en mode ONLINE - synchronisation forcée des articles offline...');
      
      // Forcer la synchronisation de tous les articles pending
      await forceSyncAllPendingArticles();
      
      // Déclencher une synchronisation immédiate après ajout à la queue
      try {
        const { syncService } = await import('../services/SyncService');
        console.log('🔄 [TEST] Déclenchement synchronisation immédiate...');
        await syncService.forceSync();
      } catch (error) {
        console.error('❌ [TEST] Erreur synchronisation immédiate:', error);
      }
    }
    
    Alert.alert(
      `Mode ${newMode ? 'OFFLINE' : 'ONLINE'}`,
      `Application basculée en mode ${newMode ? 'OFFLINE' : 'ONLINE'}. ${newMode ? 'Les articles créés resteront en local.' : 'La synchronisation Firebase est réactivée et les articles offline sont en cours de synchronisation.'}`,
      [
        {
          text: 'OK',
          onPress: () => {
            console.log(`🧪 [TEST] Mode ${newMode ? 'OFFLINE' : 'ONLINE'} activé pour test`);
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        FORCE_OFFLINE_MODE && styles.offlineButton,
        style
      ]}
      onPress={handleToggleNetwork}
    >
      <Text style={[
        styles.buttonText,
        FORCE_OFFLINE_MODE && styles.offlineButtonText
      ]}>
        {FORCE_OFFLINE_MODE ? '🌐 Activer ONLINE' : '📱 Activer OFFLINE'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignSelf: 'center',
  },
  offlineButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  offlineButtonText: {
    color: '#fff',
  },
});
