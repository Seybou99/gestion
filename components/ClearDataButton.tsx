import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clearAllData, clearTestData } from '../utils/clearData';

export const ClearDataButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleClearTestData = async () => {
    Alert.alert(
      'Nettoyer les données de test',
      'Voulez-vous supprimer les données de test (Magasin Principal, etc.) ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nettoyer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await clearTestData();
              Alert.alert(
                result.success ? 'Succès' : 'Erreur',
                result.message
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de nettoyer les données');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearAllData = async () => {
    Alert.alert(
      '⚠️ ATTENTION - Vidage complet',
      'Voulez-vous supprimer TOUTES les données ? Cette action est irréversible !',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await clearAllData();
              Alert.alert(
                result.success ? 'Succès' : 'Erreur',
                result.message
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de vider les données');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.clearTestButton]}
        onPress={handleClearTestData}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Nettoyage...' : 'Nettoyer données de test'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.clearAllButton]}
        onPress={handleClearAllData}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Suppression...' : '⚠️ Tout supprimer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearTestButton: {
    backgroundColor: '#FF9500',
  },
  clearAllButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
