#!/usr/bin/env node

/**
 * Script de correction automatique des problèmes de réseau
 * 1. Détecte l'IP réseau de la machine
 * 2. Met à jour le code automatiquement
 * 3. Teste la connectivité
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 CORRECTION AUTOMATIQUE DES PROBLÈMES DE RÉSEAU\n');

// 1. Détecter l'IP réseau
console.log('1️⃣ Détection de l\'IP réseau...');
const interfaces = os.networkInterfaces();
let networkIP = null;

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      networkIP = iface.address;
      console.log(`   ✅ IP trouvée: ${networkIP} (interface: ${name})`);
      break;
    }
  }
  if (networkIP) break;
}

if (!networkIP) {
  console.log('   ❌ Aucune IP réseau trouvée');
  process.exit(1);
}

// 2. Mettre à jour le fichier API
console.log('\n2️⃣ Mise à jour du fichier API...');
const apiFilePath = path.join(__dirname, '..', 'services', 'api.ts');

try {
  let content = fs.readFileSync(apiFilePath, 'utf8');
  
  // Remplacer l'IP
  const oldPattern = /const API_BASE_URL = 'http:\/\/[^']+:3000';/;
  const newLine = `const API_BASE_URL = 'http://${networkIP}:3000';`;
  
  if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newLine);
    fs.writeFileSync(apiFilePath, content, 'utf8');
    console.log(`   ✅ IP mise à jour: ${networkIP}`);
  } else {
    console.log('   ⚠️  Pattern non trouvé, mise à jour manuelle nécessaire');
  }
} catch (error) {
  console.log(`   ❌ Erreur: ${error.message}`);
}

// 3. Tester la connectivité
console.log('\n3️⃣ Test de connectivité...');
try {
  const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://${networkIP}:3000/health`, { 
    encoding: 'utf8',
    timeout: 5000 
  });
  
  if (result.trim() === '200') {
    console.log('   ✅ Backend accessible !');
  } else {
    console.log(`   ⚠️  Backend répond avec le code: ${result.trim()}`);
  }
} catch (error) {
  console.log('   ❌ Backend non accessible');
  console.log('   🔧 Vérifiez que le backend est démarré: cd Backend && npm start');
}

// 4. Instructions finales
console.log('\n🎉 CORRECTION TERMINÉE !');
console.log('\n📱 Instructions pour votre téléphone :');
console.log(`   1. Connectez-vous au même WiFi que cette machine`);
console.log(`   2. Dans Expo Go, utilisez l'URL: exp://${networkIP}:8081`);
console.log(`   3. Ou scannez le QR code affiché par Expo`);
console.log('\n🔧 Si ça ne marche toujours pas :');
console.log('   1. Redémarrez Expo: npx expo start --clear');
console.log('   2. Vérifiez que le backend tourne: cd Backend && npm start');
console.log('   3. Vérifiez le firewall de votre machine');

console.log(`\n💡 IP actuelle: ${networkIP}`);
console.log('   Cette IP changera si vous changez de réseau WiFi');
