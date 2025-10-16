/**
 * Script pour mettre à jour created_by dans Firestore
 * Met à jour toutes les données pour correspondre à votre UID actuel
 * 
 * Usage:
 *   node fix-created-by.js EMAIL UID
 */

const { admin, db } = require('./firebase-admin-config');

async function updateCreatedBy(email, targetUid) {
  try {
    console.log('🔧 Mise à jour des données Firestore...');
    console.log('📧 Email:', email);
    console.log('🆔 UID cible:', targetUid);
    console.log('');
    
    // Collections à mettre à jour
    const collections = [
      'products',
      'stock', 
      'categories',
      'customers',
      'inventory',
      'locations',
      'stock_movements',
      'stock_entries',
      'stock_adjustments',
      'transfers'
    ];
    
    let totalUpdated = 0;
    
    for (const collectionName of collections) {
      console.log(`📂 Traitement de la collection: ${collectionName}`);
      
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`   ℹ️  Collection vide, ignorée`);
        continue;
      }
      
      const batch = db.batch();
      let batchCount = 0;
      let collectionUpdated = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Vérifier si created_by existe et est différent de targetUid
        if (data.created_by && data.created_by !== targetUid) {
          batch.update(doc.ref, { 
            created_by: targetUid,
            created_by_name: email,
            updated_at: new Date().toISOString()
          });
          batchCount++;
          collectionUpdated++;
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
      
      if (collectionUpdated > 0) {
        console.log(`   ✅ ${collectionUpdated} documents mis à jour`);
        totalUpdated += collectionUpdated;
      } else {
        console.log(`   ℹ️  Aucun document à mettre à jour`);
      }
    }
    
    console.log('');
    console.log('🎉 Mise à jour terminée !');
    console.log(`📊 Total: ${totalUpdated} documents mis à jour`);
    console.log('');
    console.log('✅ Vous pouvez maintenant activer les règles de production :');
    console.log('   cp firestore.rules.production firestore.rules');
    console.log('   firebase deploy --only firestore:rules');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

// Arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('❌ Usage incorrect');
  console.log('');
  console.log('Usage:');
  console.log('  node fix-created-by.js EMAIL UID');
  console.log('');
  console.log('Exemple:');
  console.log('  node fix-created-by.js diokolo@gmail.com Sgi4kREfbeeBBLYhsdmHA9nlPuC3');
  console.log('');
  process.exit(1);
}

const [email, uid] = args;

// Exécuter
updateCreatedBy(email, uid)
  .then(() => {
    console.log('✅ Opération terminée avec succès');
    process.exit(0);
  })
  .catch(() => {
    console.log('❌ Échec de l\'opération');
    process.exit(1);
  });

