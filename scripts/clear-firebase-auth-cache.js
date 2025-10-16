/**
 * Script pour nettoyer le cache Firebase Auth
 */
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearFirebaseAuthCache() {
  try {
    console.log('🧹 Nettoyage du cache Firebase Auth...\n');
    
    // Clés Firebase Auth à supprimer
    const keysToRemove = [
      'firebase:authUser',
      'firebase:host',
      'firebase:heartbeat',
      'persist:auth'
    ];
    
    for (const key of keysToRemove) {
      await AsyncStorage.removeItem(key);
      console.log(`✅ ${key} supprimé`);
    }
    
    console.log('\n🎉 Cache nettoyé avec succès !');
    console.log('📱 Redémarrez l\'application et reconnectez-vous');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

clearFirebaseAuthCache();
