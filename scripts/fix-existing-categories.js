#!/usr/bin/env node

/**
 * Script pour ajouter les champs created_by et created_by_name
 * aux catégories existantes dans Firebase
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '../Backend/.env' });

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

// ID de l'utilisateur par défaut (diokolo@gmail.com)
const DEFAULT_USER_ID = 'Sgi4kREfbeeBBLYhsdmHA9nlPuC3';
const DEFAULT_USER_NAME = 'diokolo@gmail.com';

async function fixExistingCategories() {
  console.log('🔧 Correction des catégories existantes...\n');

  try {
    // Récupérer toutes les catégories
    const categoriesSnapshot = await db.collection('categories').get();
    console.log(`📊 ${categoriesSnapshot.size} catégories trouvées dans Firebase\n`);

    let fixedCount = 0;
    let alreadyOkCount = 0;

    // Parcourir chaque catégorie
    for (const doc of categoriesSnapshot.docs) {
      const category = doc.data();
      const categoryId = doc.id;

      console.log(`\n📂 Catégorie: "${category.name}" (ID: ${categoryId})`);
      
      // Vérifier si created_by existe déjà
      if (category.created_by && category.created_by_name) {
        console.log(`  ✅ Déjà configuré:`);
        console.log(`     - created_by: ${category.created_by}`);
        console.log(`     - created_by_name: ${category.created_by_name}`);
        alreadyOkCount++;
        continue;
      }

      // Ajouter les champs manquants
      const updates = {};
      
      if (!category.created_by) {
        updates.created_by = DEFAULT_USER_ID;
        console.log(`  🔧 Ajout de created_by: ${DEFAULT_USER_ID}`);
      }
      
      if (!category.created_by_name) {
        updates.created_by_name = DEFAULT_USER_NAME;
        console.log(`  🔧 Ajout de created_by_name: ${DEFAULT_USER_NAME}`);
      }

      // Mettre à jour le document
      if (Object.keys(updates).length > 0) {
        await db.collection('categories').doc(categoryId).update(updates);
        console.log(`  ✅ Catégorie mise à jour avec succès`);
        fixedCount++;
      }
    }

    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ :');
    console.log('='.repeat(60));
    console.log(`✅ Catégories déjà correctes : ${alreadyOkCount}`);
    console.log(`🔧 Catégories corrigées      : ${fixedCount}`);
    console.log(`📊 Total de catégories       : ${categoriesSnapshot.size}`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n🎉 Toutes les catégories ont été corrigées avec succès !');
      console.log('💡 Conseil : Relancez votre application pour voir les changements.');
    } else {
      console.log('\n✨ Toutes les catégories étaient déjà correctement configurées !');
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de la correction des catégories:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Exécuter le script
fixExistingCategories();

