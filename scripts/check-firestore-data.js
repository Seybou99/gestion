/**
 * Script pour vérifier les données Firestore
 * Affiche le created_by de chaque document
 */

const { db } = require('./firebase-admin-config');

async function checkData() {
  try {
    console.log('🔍 Vérification des données Firestore...\n');
    
    // Vérifier la collection stock
    const stockSnapshot = await db.collection('stock').limit(10).get();
    
    console.log('📦 Collection STOCK:');
    console.log(`   Total documents: ${stockSnapshot.size}`);
    console.log('');
    
    stockSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   Document ${index + 1}:`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - created_by: ${data.created_by || '❌ MANQUANT'}`);
      console.log(`   - created_by_name: ${data.created_by_name || '❌ MANQUANT'}`);
      console.log(`   - product_id: ${data.product_id}`);
      console.log('');
    });
    
    // Compter les documents sans created_by
    const allStock = await db.collection('stock').get();
    let withoutCreatedBy = 0;
    let withDifferentUid = 0;
    const targetUid = 'Sgi4kREfbeeBBLYhsdmHA9nlPuC3';
    
    allStock.docs.forEach(doc => {
      const data = doc.data();
      if (!data.created_by) {
        withoutCreatedBy++;
      } else if (data.created_by !== targetUid) {
        withDifferentUid++;
      }
    });
    
    console.log('📊 STATISTIQUES:');
    console.log(`   Total stock: ${allStock.size}`);
    console.log(`   Sans created_by: ${withoutCreatedBy}`);
    console.log(`   Avec UID différent: ${withDifferentUid}`);
    console.log(`   Avec bon UID (${targetUid}): ${allStock.size - withoutCreatedBy - withDifferentUid}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

checkData()
  .then(() => {
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n❌ Échec de la vérification');
    process.exit(1);
  });

