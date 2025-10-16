#!/usr/bin/env node

/**
 * Script pour nettoyer le cache local des catégories dans AsyncStorage
 * Résout le problème des anciennes catégories qui apparaissent dans les filtres
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de cache AsyncStorage (simulation)
const CACHE_PATHS = [
  path.join(__dirname, '../node_modules/.cache'),
  path.join(__dirname, '../.expo'),
  path.join(__dirname, '../.metro'),
];

function clearLocalCategoryCache() {
  console.log('🧹 Nettoyage du cache local des catégories...\n');

  try {
    let clearedCount = 0;

    // 1. Nettoyer les caches Metro/Expo
    CACHE_PATHS.forEach(cachePath => {
      if (fs.existsSync(cachePath)) {
        console.log(`🗑️ Suppression du cache: ${cachePath}`);
        fs.rmSync(cachePath, { recursive: true, force: true });
        clearedCount++;
      }
    });

    // 2. Instructions pour l'utilisateur
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ :');
    console.log('='.repeat(60));
    console.log(`🗑️ Caches nettoyés : ${clearedCount}`);
    console.log('='.repeat(60));

    console.log('\n📋 INSTRUCTIONS POUR NETTOYER LE CACHE LOCAL :');
    console.log('1. Dans Expo Go, secouez votre téléphone');
    console.log('2. Sélectionnez "Reload" ou "Recharger"');
    console.log('3. OU redémarrez complètement l\'application Expo Go');
    console.log('4. OU utilisez la commande: npx expo start --clear');
    console.log('5. Allez dans la page Articles');
    console.log('6. Vérifiez que seules VOS catégories apparaissent dans les filtres');

    console.log('\n💡 ALTERNATIVE - Commande à exécuter :');
    console.log('npx expo start --clear');

  } catch (error) {
    console.error('\n❌ Erreur lors du nettoyage du cache:', error);
  }
}

// Exécuter le script
clearLocalCategoryCache();
