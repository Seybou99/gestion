#!/usr/bin/env node

/**
 * Script de diagnostic des ventes
 * Vérifie les ventes dans la base de données locale et Firebase
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const REPO_DIR = '/Users/doumbia/Desktop/test';

console.log('🔍 DIAGNOSTIC DES VENTES');
console.log('========================\n');

try {
  // 1. Vérifier les ventes en local (AsyncStorage)
  console.log('1. 📱 VENTES LOCALES (AsyncStorage):');
  console.log('------------------------------------');
  
  // Exécuter une commande pour lire AsyncStorage
  const localSalesCheck = `
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem('sales').then(data => {
      if (data) {
        const sales = JSON.parse(data);
        console.log('📊 Nombre total de ventes locales:', sales.length);
        console.log('📋 Détails des ventes:');
        sales.forEach((sale, index) => {
          console.log(\`   \${index + 1}. ID: \${sale.id}\`);
          console.log(\`      Montant: \${sale.total_amount} FCFA\`);
          console.log(\`      Date: \${sale.sale_date}\`);
          console.log(\`      Utilisateur: \${sale.created_by_name || 'Non spécifié'}\`);
          console.log(\`      Sync Status: \${sale.sync_status}\`);
          console.log('');
        });
      } else {
        console.log('❌ Aucune vente trouvée dans AsyncStorage');
      }
    }).catch(err => {
      console.error('❌ Erreur lecture AsyncStorage:', err);
    });
  `;

  // 2. Vérifier les ventes dans Firebase
  console.log('2. 🔥 VENTES FIREBASE:');
  console.log('----------------------');
  
  // Script pour vérifier Firebase
  const firebaseCheck = `
    const admin = require('firebase-admin');
    
    // Initialiser Firebase Admin
    const serviceAccount = require('./scripts/firebase-admin-config.js');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://gestion-stock-app-default-rtdb.firebaseio.com"
    });
    
    const db = admin.firestore();
    
    async function checkFirebaseSales() {
      try {
        console.log('🔍 Vérification des ventes Firebase...');
        
        // Récupérer toutes les ventes
        const salesSnapshot = await db.collection('sales').get();
        console.log(\`📊 Nombre total de ventes Firebase: \${salesSnapshot.size}\`);
        
        if (salesSnapshot.size > 0) {
          console.log('📋 Détails des ventes Firebase:');
          salesSnapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(\`   \${index + 1}. ID Firebase: \${doc.id}\`);
            console.log(\`      ID Local: \${data.id || 'Non spécifié'}\`);
            console.log(\`      Montant: \${data.total_amount} FCFA\`);
            console.log(\`      Date: \${data.sale_date}\`);
            console.log(\`      Utilisateur: \${data.created_by_name || 'Non spécifié'}\`);
            console.log(\`      UID: \${data.user_id || data.created_by}\`);
            console.log('');
          });
        } else {
          console.log('❌ Aucune vente trouvée dans Firebase');
        }
        
        // Vérifier par utilisateur spécifique
        const userUid = 'qLLYaHqmTLTeA7ZZJTwJB1rRIgx2'; // UID de diokolo1@gmail.com
        const userSalesSnapshot = await db.collection('sales').where('user_id', '==', userUid).get();
        console.log(\`👤 Ventes pour l'utilisateur \${userUid}: \${userSalesSnapshot.size}\`);
        
        if (userSalesSnapshot.size > 0) {
          console.log('📋 Ventes de l\'utilisateur:');
          userSalesSnapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(\`   \${index + 1}. ID: \${doc.id}\`);
            console.log(\`      Montant: \${data.total_amount} FCFA\`);
            console.log(\`      Date: \${data.sale_date}\`);
            console.log('');
          });
        }
        
      } catch (error) {
        console.error('❌ Erreur Firebase:', error);
      }
    }
    
    checkFirebaseSales();
  `;

  // 3. Vérifier la queue de synchronisation
  console.log('3. 🔄 QUEUE DE SYNCHRONISATION:');
  console.log('-------------------------------');
  
  const syncQueueCheck = `
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem('sync_queue').then(data => {
      if (data) {
        const queue = JSON.parse(data);
        console.log('📊 Nombre d\'opérations en queue:', queue.length);
        
        // Filtrer les opérations de ventes
        const salesOperations = queue.filter(op => op.table_name === 'sales');
        console.log('🧾 Opérations de ventes en queue:', salesOperations.length);
        
        if (salesOperations.length > 0) {
          console.log('📋 Détails des opérations de ventes:');
          salesOperations.forEach((op, index) => {
            console.log(\`   \${index + 1}. Opération: \${op.operation}\`);
            console.log(\`      ID: \${op.record_id}\`);
            console.log(\`      Statut: \${op.status}\`);
            console.log(\`      Priorité: \${op.priority}\`);
            console.log(\`      Tentatives: \${op.retry_count}\`);
            console.log('');
          });
        }
      } else {
        console.log('❌ Aucune opération en queue');
      }
    }).catch(err => {
      console.error('❌ Erreur lecture queue:', err);
    });
  `;

  // 4. Vérifier les items de vente
  console.log('4. 📦 ITEMS DE VENTE:');
  console.log('--------------------');
  
  const saleItemsCheck = `
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem('sale_items').then(data => {
      if (data) {
        const items = JSON.parse(data);
        console.log('📊 Nombre total d\'items de vente:', items.length);
        
        if (items.length > 0) {
          console.log('📋 Détails des items:');
          items.forEach((item, index) => {
            console.log(\`   \${index + 1}. Sale ID: \${item.sale_id}\`);
            console.log(\`      Produit: \${item.product_name || 'ID: ' + item.product_id}\`);
            console.log(\`      Quantité: \${item.quantity}\`);
            console.log(\`      Prix: \${item.unit_price} FCFA\`);
            console.log(\`      Total: \${item.total_price} FCFA\`);
            console.log('');
          });
        }
      } else {
        console.log('❌ Aucun item de vente trouvé');
      }
    }).catch(err => {
      console.error('❌ Erreur lecture items:', err);
    });
  `;

  console.log('📝 Instructions pour le diagnostic:');
  console.log('');
  console.log('1. Ouvrez l\'application React Native');
  console.log('2. Allez dans la console de développement');
  console.log('3. Exécutez ces commandes une par une:');
  console.log('');
  console.log('// Vérifier les ventes locales');
  console.log('AsyncStorage.getItem("sales").then(data => {');
  console.log('  if (data) {');
  console.log('    const sales = JSON.parse(data);');
  console.log('    console.log("📊 Ventes locales:", sales.length);');
  console.log('    console.log("📋 Détails:", sales);');
  console.log('  }');
  console.log('});');
  console.log('');
  console.log('// Vérifier la queue de sync');
  console.log('AsyncStorage.getItem("sync_queue").then(data => {');
  console.log('  if (data) {');
  console.log('    const queue = JSON.parse(data);');
  console.log('    const salesOps = queue.filter(op => op.table_name === "sales");');
  console.log('    console.log("🔄 Opérations ventes en queue:", salesOps);');
  console.log('  }');
  console.log('});');
  console.log('');
  console.log('// Vérifier les items de vente');
  console.log('AsyncStorage.getItem("sale_items").then(data => {');
  console.log('  if (data) {');
  console.log('    const items = JSON.parse(data);');
  console.log('    console.log("📦 Items de vente:", items.length);');
  console.log('    console.log("📋 Détails:", items);');
  console.log('  }');
  console.log('});');

} catch (error) {
  console.error('❌ Erreur lors du diagnostic:', error.message);
}

console.log('\n🔍 DIAGNOSTIC TERMINÉ');
console.log('=====================');
