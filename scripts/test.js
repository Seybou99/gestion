#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Démarrage des tests d\'authentification...\n');

try {
  // Installer les dépendances de test si nécessaire
  console.log('📦 Vérification des dépendances de test...');
  execSync('npm install --silent', { stdio: 'inherit' });

  // Exécuter les tests unitaires
  console.log('\n🔬 Exécution des tests unitaires...');
  execSync('npm test -- --verbose', { stdio: 'inherit' });

  // Exécuter les tests avec couverture
  console.log('\n📊 Génération du rapport de couverture...');
  execSync('npm run test:coverage', { stdio: 'inherit' });

  console.log('\n✅ Tous les tests sont passés avec succès !');
  console.log('\n📈 Rapport de couverture disponible dans coverage/');
  console.log('🌐 Ouvrez coverage/lcov-report/index.html dans votre navigateur pour voir le rapport détaillé.');

} catch (error) {
  console.error('\n❌ Erreur lors de l\'exécution des tests:', error.message);
  process.exit(1);
}
