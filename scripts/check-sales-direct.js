#!/usr/bin/env node

/**
 * Script pour vérifier directement les ventes dans AsyncStorage
 * Utilise React Native Debugger ou console de développement
 */

console.log('🔍 VÉRIFICATION DIRECTE DES VENTES');
console.log('==================================\n');

console.log('📱 INSTRUCTIONS POUR VÉRIFIER LES VENTES:');
console.log('');

console.log('1. Ouvrez l\'application React Native');
console.log('2. Allez dans la console de développement (Metro/Expo)');
console.log('3. Copiez et collez ces commandes:');
console.log('');

console.log('// === VÉRIFICATION ASYNCSTORAGE ===');
console.log('const AsyncStorage = require("@react-native-async-storage/async-storage");');
console.log('');
console.log('// 1. Vérifier les ventes');
console.log('AsyncStorage.getItem("sales").then(data => {');
console.log('  console.log("=== VENTES ===");');
console.log('  if (data) {');
console.log('    const sales = JSON.parse(data);');
console.log('    console.log("📊 Nombre de ventes:", sales.length);');
console.log('    if (sales.length > 0) {');
console.log('      console.log("📋 Détails:");');
console.log('      sales.forEach((sale, i) => {');
console.log('        console.log(\`  \${i+1}. ID: \${sale.id}\`);');
console.log('        console.log(\`     Montant: \${sale.total_amount} FCFA\`);');
console.log('        console.log(\`     Date: \${sale.sale_date}\`);');
console.log('        console.log(\`     user_id: \${sale.user_id}\`);');
console.log('        console.log(\`     created_by: \${sale.created_by}\`);');
console.log('        console.log(\`     created_by_name: \${sale.created_by_name}\`);');
console.log('        console.log(\`     sync_status: \${sale.sync_status}\`);');
console.log('        console.log("");');
console.log('      });');
console.log('    }');
console.log('  } else {');
console.log('    console.log("❌ Aucune vente trouvée");');
console.log('  }');
console.log('});');
console.log('');

console.log('// 2. Vérifier les items de vente');
console.log('AsyncStorage.getItem("sale_items").then(data => {');
console.log('  console.log("=== ITEMS DE VENTE ===");');
console.log('  if (data) {');
console.log('    const items = JSON.parse(data);');
console.log('    console.log("📦 Nombre d\'items:", items.length);');
console.log('    if (items.length > 0) {');
console.log('      console.log("📋 Détails:");');
console.log('      items.forEach((item, i) => {');
console.log('        console.log(\`  \${i+1}. Sale ID: \${item.sale_id}\`);');
console.log('        console.log(\`     Produit: \${item.product_name || item.product_id}\`);');
console.log('        console.log(\`     Quantité: \${item.quantity}\`);');
console.log('        console.log(\`     Prix: \${item.unit_price} FCFA\`);');
console.log('        console.log(\`     Total: \${item.total_price} FCFA\`);');
console.log('        console.log("");');
console.log('      });');
console.log('    }');
console.log('  } else {');
console.log('    console.log("❌ Aucun item trouvé");');
console.log('  }');
console.log('});');
console.log('');

console.log('// 3. Vérifier la queue de synchronisation');
console.log('AsyncStorage.getItem("sync_queue").then(data => {');
console.log('  console.log("=== QUEUE DE SYNC ===");');
console.log('  if (data) {');
console.log('    const queue = JSON.parse(data);');
console.log('    console.log("🔄 Total opérations:", queue.length);');
console.log('    ');
console.log('    const salesOps = queue.filter(op => op.table_name === "sales");');
console.log('    console.log("🧾 Opérations ventes:", salesOps.length);');
console.log('    ');
console.log('    if (salesOps.length > 0) {');
console.log('      console.log("📋 Détails opérations ventes:");');
console.log('      salesOps.forEach((op, i) => {');
console.log('        console.log(\`  \${i+1}. Opération: \${op.operation}\`);');
console.log('        console.log(\`     ID: \${op.record_id}\`);');
console.log('        console.log(\`     Statut: \${op.status}\`);');
console.log('        console.log(\`     Tentatives: \${op.retry_count}\`);');
console.log('        console.log("");');
console.log('      });');
console.log('    }');
console.log('  } else {');
console.log('    console.log("❌ Aucune opération en queue");');
console.log('  }');
console.log('});');
console.log('');

console.log('// 4. Vérifier les clés AsyncStorage');
console.log('AsyncStorage.getAllKeys().then(keys => {');
console.log('  console.log("=== CLÉS ASYNCSTORAGE ===");');
console.log('  console.log("📋 Toutes les clés:", keys);');
console.log('  ');
console.log('  const salesKeys = keys.filter(key => key.includes("sale"));');
console.log('  console.log("🧾 Clés liées aux ventes:", salesKeys);');
console.log('});');
console.log('');

console.log('// === VÉRIFICATION BASE DE DONNÉES ===');
console.log('// 5. Vérifier via DatabaseService');
console.log('const { databaseService } = require("./services/DatabaseService.ts");');
console.log('databaseService.getAll("sales").then(sales => {');
console.log('  console.log("=== VIA DATABASESERVICE ===");');
console.log('  console.log("📊 Ventes via DatabaseService:", sales.length);');
console.log('  if (sales.length > 0) {');
console.log('    console.log("📋 Détails:");');
console.log('    sales.forEach((sale, i) => {');
console.log('      console.log(\`  \${i+1}. ID: \${sale.id}\`);');
console.log('      console.log(\`     Montant: \${sale.total_amount} FCFA\`);');
console.log('      console.log(\`     Date: \${sale.sale_date}\`);');
console.log('      console.log(\`     user_id: \${sale.user_id}\`);');
console.log('      console.log(\`     created_by: \${sale.created_by}\`);');
console.log('      console.log("");');
console.log('    });');
console.log('  }');
console.log('});');
console.log('');

console.log('📝 NOTES IMPORTANTES:');
console.log('=====================');
console.log('');
console.log('1. Si vous voyez des ventes dans AsyncStorage mais pas dans l\'historique:');
console.log('   → Problème de filtrage (user_id vs created_by)');
console.log('');
console.log('2. Si vous ne voyez aucune vente:');
console.log('   → La vente n\'a pas été sauvegardée');
console.log('   → Problème lors de la création de la vente');
console.log('');
console.log('3. Si vous voyez des opérations en queue:');
console.log('   → Les ventes sont en attente de synchronisation');
console.log('');
console.log('4. Vérifiez que l\'UID utilisateur correspond:');
console.log('   → UID attendu: qLLYaHqmTLTeA7ZZJTwJB1rRIgx2');
console.log('   → Vérifiez dans les logs: "👤 [RECU] UID utilisateur"');
console.log('');

console.log('🔍 DIAGNOSTIC TERMINÉ');
console.log('=====================');
