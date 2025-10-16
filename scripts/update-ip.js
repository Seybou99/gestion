#!/usr/bin/env node

/**
 * Script pour mettre à jour automatiquement l'IP dans le code
 * Utilise le script de test de connectivité pour trouver la bonne IP
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Fonction pour tester la connectivité et récupérer la première IP qui fonctionne
const findWorkingIP = () => {
  try {
    console.log('🔍 Recherche de l\'IP qui fonctionne...');
    
    // Exécuter le script de test de connectivité
    const result = execSync('node scripts/test-connectivity.js', { 
      encoding: 'utf8',
      timeout: 30000 // 30 secondes max
    });
    
    // Extraire l'IP de la sortie
    const lines = result.split('\n');
    const ipLine = lines.find(line => line.includes('IP RECOMMANDÉE'));
    
    if (ipLine) {
      const match = ipLine.match(/http:\/\/([^:]+):3000/);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche d\'IP:', error.message);
    return null;
  }
};

// Fonction pour mettre à jour l'IP dans le fichier
const updateIPInFile = (filePath, newIP) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remplacer l'IP dans le fichier
    const oldPattern = /const API_BASE_URL = 'http:\/\/[^']+:3000';/;
    const newLine = `const API_BASE_URL = 'http://${newIP}:3000';`;
    
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newLine);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ IP mise à jour dans ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  Pattern non trouvé dans ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de ${filePath}:`, error.message);
    return false;
  }
};

// Fonction principale
const main = async () => {
  console.log('🚀 Mise à jour automatique de l\'IP...\n');
  
  // Trouver l'IP qui fonctionne
  const workingIP = findWorkingIP();
  
  if (!workingIP) {
    console.log('❌ Impossible de trouver une IP qui fonctionne');
    console.log('🔧 Vérifiez que le backend est démarré : cd Backend && npm start');
    process.exit(1);
  }
  
  console.log(`🎯 IP trouvée : ${workingIP}\n`);
  
  // Mettre à jour le fichier API
  const apiFilePath = path.join(__dirname, '..', 'services', 'api.ts');
  const success = updateIPInFile(apiFilePath, workingIP);
  
  if (success) {
    console.log('\n🎉 Mise à jour terminée !');
    console.log(`📱 Votre application utilisera maintenant : http://${workingIP}:3000`);
    console.log('\n💡 Redémarrez l\'application Expo pour appliquer les changements');
  } else {
    console.log('\n❌ Échec de la mise à jour');
    process.exit(1);
  }
};

// Exécuter le script
main().catch(console.error);
