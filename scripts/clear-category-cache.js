#!/usr/bin/env node

/**
 * Script pour nettoyer le cache des catégories et forcer la synchronisation
 * Résout le problème des anciennes catégories qui apparaissent dans les filtres
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

// ID de l'utilisateur par défaut
const DEFAULT_USER_ID = 'Sgi4kREfbeeBBLYhsdmHA9nlPuC3';
const DEFAULT_USER_NAME = 'diokolo@gmail.com';

async function clearCategoryCache() {
  console.log('🧹 Nettoyage du cache des catégories...\n');

  try {
    // 1. Lister toutes les catégories dans Firebase
    const categoriesSnapshot = await db.collection('categories').get();
    console.log(`📊 ${categoriesSnapshot.size} catégories trouvées dans Firebase\n`);

    let userCategories = 0;
    let otherCategories = 0;
    let fixedCategories = 0;

    // 2. Analyser chaque catégorie
    for (const doc of categoriesSnapshot.docs) {
      const category = doc.data();
      const categoryId = doc.id;

      console.log(`📂 Catégorie: "${category.name}" (ID: ${categoryId})`);
      
      // Vérifier si c'est une catégorie de l'utilisateur
      if (category.created_by === DEFAULT_USER_ID) {
        console.log(`  ✅ Catégorie de l'utilisateur (${category.created_by_name})`);
        userCategories++;
      } else if (category.created_by && category.created_by_name) {
        console.log(`  👤 Catégorie d'un autre utilisateur (${category.created_by_name})`);
        otherCategories++;
      } else {
        console.log(`  ❌ Catégorie sans created_by - CORRECTION NÉCESSAIRE`);
        
        // Corriger la catégorie
        await db.collection('categories').doc(categoryId).update({
          created_by: DEFAULT_USER_ID,
          created_by_name: DEFAULT_USER_NAME,
        });
        
        console.log(`  🔧 Catégorie corrigée avec created_by: ${DEFAULT_USER_ID}`);
        fixedCategories++;
      }
    }

    // 3. Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ :');
    console.log('='.repeat(60));
    console.log(`✅ Catégories de l'utilisateur : ${userCategories}`);
    console.log(`👤 Catégories d'autres utilisateurs : ${otherCategories}`);
    console.log(`🔧 Catégories corrigées : ${fixedCategories}`);
    console.log(`📊 Total de catégories : ${categoriesSnapshot.size}`);
    console.log('='.repeat(60));

    if (fixedCategories > 0) {
      console.log('\n🎉 Catégories corrigées avec succès !');
      console.log('💡 Conseil : Redémarrez votre application pour voir les changements.');
    } else {
      console.log('\n✨ Toutes les catégories étaient déjà correctement configurées !');
    }

    // 4. Instructions pour l'utilisateur
    console.log('\n📋 INSTRUCTIONS :');
    console.log('1. Redémarrez votre application Expo Go');
    console.log('2. Allez dans la page Articles');
    console.log('3. Vérifiez que seules VOS catégories apparaissent dans les filtres');
    console.log('4. Si le problème persiste, videz le cache de l\'application');

  } catch (error) {
    console.error('\n❌ Erreur lors du nettoyage du cache:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Exécuter le script
clearCategoryCache();
