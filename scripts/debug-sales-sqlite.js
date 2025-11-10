const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données SQLite
const dbPath = path.join(__dirname, '../node_modules/expo-sqlite/databases', 'database.db');

async function debugSalesSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ [DEBUG SALES] Erreur ouverture base de données:', err.message);
        reject(err);
        return;
      }
      console.log('✅ [DEBUG SALES] Base de données SQLite ouverte');
    });

    try {
      console.log('🔍 [DEBUG SALES] Début du diagnostic SQLite...');
      
      // 1. Vérifier les ventes
      console.log('\n📊 [DEBUG SALES] 1. Vérification des ventes...');
      db.all("SELECT * FROM sales ORDER BY created_at DESC LIMIT 10", [], (err, rows) => {
        if (err) {
          console.error('❌ [DEBUG SALES] Erreur requête ventes:', err.message);
        } else {
          console.log(`✅ [DEBUG SALES] ${rows.length} ventes trouvées dans SQLite`);
          
          rows.forEach((sale, index) => {
            console.log(`\n📋 [DEBUG SALES] Vente ${index + 1}:`);
            console.log(`   ID: ${sale.id}`);
            console.log(`   User ID: ${sale.user_id}`);
            console.log(`   Created By: ${sale.created_by}`);
            console.log(`   Montant: ${sale.total_amount} FCFA`);
            console.log(`   Date: ${sale.sale_date}`);
            console.log(`   Sync Status: ${sale.sync_status}`);
          });
        }
        
        // 2. Vérifier les items de vente
        console.log('\n📦 [DEBUG SALES] 2. Vérification des items de vente...');
        db.all("SELECT * FROM sale_items ORDER BY id DESC LIMIT 20", [], (err, rows) => {
          if (err) {
            console.error('❌ [DEBUG SALES] Erreur requête items:', err.message);
          } else {
            console.log(`✅ [DEBUG SALES] ${rows.length} items de vente trouvés`);
            
            rows.forEach((item, index) => {
              console.log(`\n🛒 [DEBUG SALES] Item ${index + 1}:`);
              console.log(`   Sale ID: ${item.sale_id}`);
              console.log(`   Product ID: ${item.product_id}`);
              console.log(`   Product Name: ${item.product_name || 'N/A'}`);
              console.log(`   Quantité: ${item.quantity}`);
              console.log(`   Prix unitaire: ${item.unit_price} FCFA`);
              console.log(`   Prix total: ${item.total_price} FCFA`);
            });
          }
          
          // 3. Vérifier les produits
          console.log('\n📦 [DEBUG SALES] 3. Vérification des produits...');
          db.all("SELECT * FROM products ORDER BY created_at DESC LIMIT 5", [], (err, rows) => {
            if (err) {
              console.error('❌ [DEBUG SALES] Erreur requête produits:', err.message);
            } else {
              console.log(`✅ [DEBUG SALES] ${rows.length} produits trouvés`);
              
              rows.forEach((product, index) => {
                console.log(`\n📦 [DEBUG SALES] Produit ${index + 1}:`);
                console.log(`   ID: ${product.id}`);
                console.log(`   Nom: ${product.name}`);
                console.log(`   SKU: ${product.sku}`);
                console.log(`   Prix: ${product.price_sell} FCFA`);
                console.log(`   Created By: ${product.created_by}`);
              });
            }
            
            // 4. Vérifier le stock
            console.log('\n📊 [DEBUG SALES] 4. Vérification du stock...');
            db.all("SELECT * FROM stock ORDER BY updated_at DESC LIMIT 5", [], (err, rows) => {
              if (err) {
                console.error('❌ [DEBUG SALES] Erreur requête stock:', err.message);
              } else {
                console.log(`✅ [DEBUG SALES] ${rows.length} entrées de stock trouvées`);
                
                rows.forEach((item, index) => {
                  console.log(`\n📊 [DEBUG SALES] Stock ${index + 1}:`);
                  console.log(`   ID: ${item.id}`);
                  console.log(`   Product ID: ${item.product_id}`);
                  console.log(`   Quantité: ${item.quantity_current}`);
                  console.log(`   Created By: ${item.created_by}`);
                  console.log(`   Sync Status: ${item.sync_status}`);
                  console.log(`   Dernière mise à jour: ${item.updated_at}`);
                });
              }
              
              // Fermer la base de données
              db.close((err) => {
                if (err) {
                  console.error('❌ [DEBUG SALES] Erreur fermeture base:', err.message);
                  reject(err);
                } else {
                  console.log('\n✅ [DEBUG SALES] Diagnostic SQLite terminé !');
                  resolve();
                }
              });
            });
          });
        });
      });
      
    } catch (error) {
      console.error('❌ [DEBUG SALES] Erreur générale:', error);
      reject(error);
    }
  });
}

// Exécuter le diagnostic
debugSalesSQLite().catch(console.error);
