#!/usr/bin/env node

/**
 * Script pour corriger les ventes existantes avec le mauvais user_id
 * Change "default-user-pos" vers le vrai UID Firebase de l'utilisateur
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Configuration
const CORRECT_USER_ID = 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2'; // UID de diokolo1@gmail.com
const CORRECT_CREATED_BY = 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2';
const CORRECT_CREATED_BY_NAME = 'diokolo1@gmail.com';

console.log('🔧 CORRECTION DES VENTES EXISTANTES');
console.log('==================================\n');

console.log('📋 Instructions pour corriger les ventes:');
console.log('');

console.log('1. Ouvrez l\'application React Native');
console.log('2. Allez dans la console de développement');
console.log('3. Copiez et collez ces commandes:');
console.log('');

console.log('// === CORRECTION DES VENTES ===');
console.log('const AsyncStorage = require("@react-native-async-storage/async-storage");');
console.log('');
console.log('const CORRECT_USER_ID = "qLLYaHqmTLTeA7ZZJTwJB1rRIgx2";');
console.log('const CORRECT_CREATED_BY = "qLLYaHqmTLTeA7ZZJTwJB1rRIgx2";');
console.log('const CORRECT_CREATED_BY_NAME = "diokolo1@gmail.com";');
console.log('');
console.log('// 1. Lire les ventes actuelles');
console.log('AsyncStorage.getItem("sales").then(data => {');
console.log('  if (data) {');
console.log('    const sales = JSON.parse(data);');
console.log('    console.log("📊 Ventes avant correction:", sales.length);');
console.log('    ');
console.log('    // 2. Corriger les ventes avec "default-user-pos"');
console.log('    let correctedCount = 0;');
console.log('    const correctedSales = sales.map(sale => {');
console.log('      if (sale.user_id === "default-user-pos" || sale.created_by === "default-user-pos") {');
console.log('        correctedCount++;');
console.log('        console.log(`🔧 Correction vente ${sale.id}:`, {');
console.log('          old_user_id: sale.user_id,');
console.log('          old_created_by: sale.created_by,');
console.log('          new_user_id: CORRECT_USER_ID,');
console.log('          new_created_by: CORRECT_CREATED_BY');
console.log('        });');
console.log('        ');
console.log('        return {');
console.log('          ...sale,');
console.log('          user_id: CORRECT_USER_ID,');
console.log('          created_by: CORRECT_CREATED_BY,');
console.log('          created_by_name: CORRECT_CREATED_BY_NAME,');
console.log('          updated_at: new Date().toISOString()');
console.log('        };');
console.log('      }');
console.log('      return sale;');
console.log('    });');
console.log('    ');
console.log('    // 3. Sauvegarder les ventes corrigées');
console.log('    if (correctedCount > 0) {');
console.log('      AsyncStorage.setItem("sales", JSON.stringify(correctedSales)).then(() => {');
console.log('        console.log(`✅ ${correctedCount} ventes corrigées et sauvegardées`);');
console.log('        ');
console.log('        // 4. Vérifier le résultat');
console.log('        console.log("📋 Ventes après correction:");');
console.log('        correctedSales.forEach((sale, i) => {');
console.log('          console.log(`  ${i+1}. ID: ${sale.id}`);');
console.log('          console.log(`     Montant: ${sale.total_amount} FCFA`);');
console.log('          console.log(`     user_id: ${sale.user_id}`);');
console.log('          console.log(`     created_by: ${sale.created_by}`);');
console.log('          console.log(`     created_by_name: ${sale.created_by_name}`);');
console.log('        });');
console.log('      });');
console.log('    } else {');
console.log('      console.log("✅ Aucune vente à corriger");');
console.log('    }');
console.log('  } else {');
console.log('    console.log("❌ Aucune vente trouvée");');
console.log('  }');
console.log('});');
console.log('');

console.log('// === VÉRIFICATION FINALE ===');
console.log('// Après correction, vérifiez que l\'historique fonctionne');
console.log('console.log("🎯 Testez maintenant l\'historique des ventes dans Paramètres");');
console.log('');

console.log('📝 RÉSULTAT ATTENDU:');
console.log('===================');
console.log('');
console.log('Avant:');
console.log('  user_id: "default-user-pos"');
console.log('  created_by: "default-user-pos"');
console.log('  created_by_name: "Vendeur POS"');
console.log('');
console.log('Après:');
console.log('  user_id: "qLLYaHqmTLTeA7ZZJTwJB1rRIgx2"');
console.log('  created_by: "qLLYaHqmTLTeA7ZZJTwJB1rRIgx2"');
console.log('  created_by_name: "diokolo1@gmail.com"');
console.log('');

console.log('🔍 DIAGNOSTIC TERMINÉ');
console.log('=====================');
