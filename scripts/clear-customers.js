// Script pour nettoyer les clients en dur du cache local
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearCustomers() {
  try {
    console.log('🧹 Nettoyage des clients en dur...');
    
    // Supprimer tous les clients
    await AsyncStorage.setItem('customers', JSON.stringify([]));
    
    console.log('✅ Clients supprimés avec succès');
    console.log('📝 Les clients doivent maintenant être créés via l\'interface');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

clearCustomers();
