/**
 * Script pour nettoyer Firestore
 * Supprime tous les documents qui n'ont PAS de created_by
 * 
 * Usage:
 *   node clean-firestore-no-created-by.js
 */

const { db } = require('./firebase-admin-config');

async function cleanFirestore() {
  try {
    console.log('🧹 Nettoyage de Firestore...\n');
    
    const collections = [
      'products',
      'stock', 
      'categories',
      'customers',
      'inventory',
      'locations'
    ];
    
    let totalDeleted = 0;
    
    for (const collectionName of collections) {
      console.log(`📂 Traitement de la collection: ${collectionName}`);
      
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`   ℹ️  Collection vide, ignorée\n`);
        continue;
      }
      
      const batch = db.batch();
      let batchCount = 0;
      let collectionDeleted = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Supprimer si created_by est absent ou vide
        if (!data.created_by || data.created_by === '') {
          console.log(`   🗑️  Document sans created_by: ${doc.id} (${data.name || 'sans nom'})`);
          batch.delete(doc.ref);
          batchCount++;
          collectionDeleted++;
        }
        
        // Firebase limite les batch à 500 opérations
        if (batchCount === 500) {
          batch.commit();
          batchCount = 0;
        }
      });
      
      // Commit le dernier batch
      if (batchCount > 0) {
        await batch.commit();
      }
      
      if (collectionDeleted > 0) {
        console.log(`   ✅ ${collectionDeleted} documents supprimés\n`);
        totalDeleted += collectionDeleted;
      } else {
        console.log(`   ✅ Tous les documents ont un created_by\n`);
      }
    }
    
    console.log('🎉 Nettoyage terminé !');
    console.log(`📊 Total: ${totalDeleted} documents supprimés`);
    console.log('');
    console.log('✅ Firestore est maintenant propre !');
    console.log('💡 Vous pouvez recréer vos produits dans l\'application');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

cleanFirestore()
  .then(() => {
    console.log('\n✅ Opération terminée avec succès');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n❌ Échec de l\'opération');
    process.exit(1);
  });

