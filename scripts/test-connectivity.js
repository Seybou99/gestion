#!/usr/bin/env node

/**
 * Script de test de connectivité automatique
 * Teste toutes les IPs possibles du réseau local pour trouver le backend
 */

const https = require('https');
const http = require('http');

// Fonction pour générer les IPs possibles
const generateLocalIPs = () => {
  const ips = [];
  
  const commonRanges = [
    '192.168.1',   // Routeur classique
    '192.168.0',   // Routeur classique  
    '192.168.8',   // Réseau actuel
    '10.0.0',      // Réseau d'entreprise
    '172.16.0',    // Réseau d'entreprise
  ];
  
  commonRanges.forEach(range => {
    for (let i = 1; i <= 20; i++) {
      ips.push(`http://${range}.${i}:3000`);
    }
  });
  
  ips.unshift('http://localhost:3000');
  return ips;
};

// Fonction de test de connectivité
const testConnection = (url) => {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 3000; // 3 secondes
    
    const req = protocol.get(url + '/health', { timeout }, (res) => {
      if (res.statusCode === 200) {
        resolve({ url, success: true, status: res.statusCode });
      } else {
        resolve({ url, success: false, status: res.statusCode });
      }
    });
    
    req.on('error', () => {
      resolve({ url, success: false, error: 'Connection failed' });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, success: false, error: 'Timeout' });
    });
  });
};

// Fonction principale
const main = async () => {
  console.log('🔍 Test de connectivité automatique...\n');
  
  const ips = generateLocalIPs();
  console.log(`📡 Test de ${ips.length} adresses IP possibles...\n`);
  
  const results = [];
  
  // Tester toutes les IPs en parallèle (mais limité à 10 simultanées)
  const batchSize = 10;
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(testConnection));
    results.push(...batchResults);
    
    // Afficher le progrès
    const progress = Math.min(i + batchSize, ips.length);
    process.stdout.write(`\r⏳ Test en cours... ${progress}/${ips.length}`);
  }
  
  console.log('\n\n📊 Résultats :\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('✅ CONNEXIONS RÉUSSIES :');
    successful.forEach(result => {
      console.log(`   🟢 ${result.url} (Status: ${result.status})`);
    });
    
    console.log('\n🎯 IP RECOMMANDÉE :');
    console.log(`   ${successful[0].url}`);
    
    // Extraire l'IP pour mise à jour automatique
    const ip = successful[0].url.replace('http://', '').replace(':3000', '');
    console.log(`\n📝 Pour mettre à jour automatiquement, utilisez :`);
    console.log(`   IP: ${ip}`);
    
  } else {
    console.log('❌ AUCUNE CONNEXION RÉUSSIE');
    console.log('\n🔧 Vérifications à faire :');
    console.log('   1. Le backend est-il démarré ? (cd Backend && npm start)');
    console.log('   2. Êtes-vous sur le même réseau WiFi ?');
    console.log('   3. Le port 3000 est-il libre ?');
  }
  
  console.log(`\n📈 Statistiques :`);
  console.log(`   ✅ Réussies: ${successful.length}`);
  console.log(`   ❌ Échouées: ${failed.length}`);
  console.log(`   📊 Total: ${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ ÉCHECS LES PLUS FRÉQUENTS :');
    const errorCounts = {};
    failed.forEach(result => {
      const error = result.error || `Status ${result.status}`;
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([error, count]) => {
        console.log(`   • ${error}: ${count} fois`);
      });
  }
};

// Exécuter le script
main().catch(console.error);
