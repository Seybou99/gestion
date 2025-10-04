import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { checkAndFixFirebaseSync } from '../utils/checkFirebaseSync';

interface FirebaseCheckButtonProps {
  style?: ViewStyle;
}

export const FirebaseCheckButton: React.FC<FirebaseCheckButtonProps> = ({ style }) => {
  const [loading, setLoading] = useState(false);

  const handleFirebaseCheck = async () => {
    setLoading(true);
    
    try {
      console.log('🔍 [BUTTON] Début vérification Firebase...');
      
      // Vérifier et corriger la synchronisation Firebase
      const result = await checkAndFixFirebaseSync();
      
      // Afficher le résultat
      if (result.fixed > 0) {
        Alert.alert(
          'Vérification Firebase',
          `✅ Synchronisation corrigée !\n\n📦 Produits locaux: ${result.local}\n🌐 Produits Firebase: ${result.firebase}\n❌ Produits manquants: ${result.missing}\n🔧 Produits corrigés: ${result.fixed}\n\nTous vos produits sont maintenant dans Firebase !`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Vérification Firebase',
          `ℹ️ Synchronisation déjà correcte !\n\n📦 Produits locaux: ${result.local}\n🌐 Produits Firebase: ${result.firebase}\n❌ Produits manquants: ${result.missing}\n🔧 Produits corrigés: ${result.fixed}\n\nTous vos produits sont bien dans Firebase !`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ [BUTTON] Erreur vérification Firebase:', error);
      Alert.alert(
        'Erreur',
        `❌ Erreur lors de la vérification Firebase: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
      onPress={handleFirebaseCheck}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? '🔍 Vérification...' : '🔍 Vérifier Firebase'}
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
    backgroundColor: '#28a745', // Vert pour vérification
  },
  loadingButton: {
    backgroundColor: '#20c997', // Vert plus clair quand loading
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
