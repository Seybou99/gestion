#!/usr/bin/env node

/**
 * Script de correction automatique d'IP - Version simplifiée
 * Met à jour l'IP dans le code et redémarre Expo
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 CORRECTION AUTOMATIQUE D\'IP\n');

// 1. Détecter l'IP réseau
const interfaces = os.networkInterfaces();
let networkIP = null;

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      networkIP = iface.address;
      break;
    }
  }
  if (networkIP) break;
}

if (!networkIP) {
  console.log('❌ Aucune IP réseau trouvée');
  process.exit(1);
}

console.log(`✅ IP détectée: ${networkIP}`);

// 2. Mettre à jour le fichier API
const apiFilePath = path.join(__dirname, '..', 'services', 'api.ts');
const networkUtilsPath = path.join(__dirname, '..', 'utils', 'networkUtils.ts');

try {
  // Mettre à jour api.ts
  let content = fs.readFileSync(apiFilePath, 'utf8');
  content = content.replace(
    /ips\.push\('http:\/\/192\.168\.8\.68:3000'\);/,
    `ips.push('http://${networkIP}:3000');`
  );
  content = content.replace(
    /const API_BASE_URL = 'http:\/\/[^']+:3000';/,
    `const API_BASE_URL = 'http://${networkIP}:3000';`
  );
  fs.writeFileSync(apiFilePath, content, 'utf8');
  console.log(`✅ services/api.ts mis à jour`);
  
  // Mettre à jour networkUtils.ts
  let utilsContent = fs.readFileSync(networkUtilsPath, 'utf8');
  utilsContent = utilsContent.replace(
    /return '192\.168\.8\.68';/,
    `return '${networkIP}';`
  );
  fs.writeFileSync(networkUtilsPath, utilsContent, 'utf8');
  console.log(`✅ utils/networkUtils.ts mis à jour`);
  
} catch (error) {
  console.log(`❌ Erreur: ${error.message}`);
  process.exit(1);
}

// 3. Tester la connectivité
console.log('\n🔍 Test de connectivité...');
try {
  const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://${networkIP}:3000/health`, { 
    encoding: 'utf8',
    timeout: 5000 
  });
  
  if (result.trim() === '200') {
    console.log('✅ Backend accessible !');
  } else {
    console.log(`⚠️  Backend répond avec le code: ${result.trim()}`);
  }
} catch (error) {
  console.log('❌ Backend non accessible');
  console.log('🔧 Vérifiez que le backend est démarré: cd Backend && npm start');
}

console.log('\n🎉 CORRECTION TERMINÉE !');
console.log(`📱 IP actuelle: ${networkIP}`);
console.log('🔄 Redémarrez Expo pour appliquer les changements');
console.log('   npx expo start --clear');
