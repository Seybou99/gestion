#!/usr/bin/env node

/**
 * Script de vérification du mode production
 */

const fs = require('fs');

console.log('🔍 VÉRIFICATION DU MODE PRODUCTION\n');

// 1. Vérifier les règles Firestore
console.log('1️⃣ Vérification des règles Firestore...');
try {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  if (rules.includes('request.auth != null') && rules.includes('created_by == request.auth.uid')) {
    console.log('   ✅ Règles de production actives');
  } else {
    console.log('   ❌ Règles de développement encore actives');
  }
} catch (error) {
  console.log('   ❌ Erreur lecture règles:', error.message);
}

// 2. Vérifier les imports getCurrentUser
console.log('\n2️⃣ Vérification des imports getCurrentUser...');
const filesToCheck = [
  'app/articles/index.tsx',
  'app/stock/index.tsx',
  'app/ventes/index.tsx',
  'app/entrepots/index.tsx',
  'app/categories/index.tsx'
];

let filesWithImport = 0;
filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('getCurrentUser')) {
      console.log(`   ✅ ${file} - Import présent`);
      filesWithImport++;
    } else {
      console.log(`   ❌ ${file} - Import manquant`);
    }
  } catch (error) {
    console.log(`   ❌ ${file} - Erreur lecture: ${error.message}`);
  }
});

console.log(`\n   📊 ${filesWithImport}/${filesToCheck.length} fichiers avec import`);

// 3. Vérifier les appels getAllByUser
console.log('\n3️⃣ Vérification des appels getAllByUser...');
let filesWithGetAllByUser = 0;
filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('getAllByUser')) {
      console.log(`   ✅ ${file} - getAllByUser présent`);
      filesWithGetAllByUser++;
    } else {
      console.log(`   ⚠️  ${file} - getAllByUser manquant`);
    }
  } catch (error) {
    console.log(`   ❌ ${file} - Erreur lecture: ${error.message}`);
  }
});

console.log(`\n   📊 ${filesWithGetAllByUser}/${filesToCheck.length} fichiers avec getAllByUser`);

// 4. Vérifier les erreurs de syntaxe
console.log('\n4️⃣ Vérification des erreurs de syntaxe...');
let filesWithErrors = 0;
filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('[object Promise]')) {
      console.log(`   ❌ ${file} - Erreur [object Promise] détectée`);
      filesWithErrors++;
    } else {
      console.log(`   ✅ ${file} - Pas d'erreur de syntaxe`);
    }
  } catch (error) {
    console.log(`   ❌ ${file} - Erreur lecture: ${error.message}`);
    filesWithErrors++;
  }
});

console.log(`\n   📊 ${filesWithErrors} fichiers avec erreurs`);

// 5. Résumé
console.log('\n📋 RÉSUMÉ :');
try {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  console.log(`✅ Règles Firestore : ${rules.includes('request.auth != null') ? 'Production' : 'Développement'}`);
} catch (error) {
  console.log('❌ Règles Firestore : Erreur de lecture');
}
console.log(`✅ Imports getCurrentUser : ${filesWithImport}/${filesToCheck.length}`);
console.log(`✅ Appels getAllByUser : ${filesWithGetAllByUser}/${filesToCheck.length}`);
console.log(`✅ Erreurs de syntaxe : ${filesWithErrors === 0 ? 'Aucune' : filesWithErrors + ' détectées'}`);

if (filesWithImport === filesToCheck.length && filesWithGetAllByUser === filesToCheck.length && filesWithErrors === 0) {
  console.log('\n🎉 MODE PRODUCTION PRÊT !');
  console.log('\n📱 Prochaines étapes :');
  console.log('1. Connectez-vous avec votre compte');
  console.log('2. Vérifiez que vous ne voyez que vos données');
  console.log('3. Testez avec un autre utilisateur');
} else {
  console.log('\n⚠️  MODE PRODUCTION INCOMPLET');
  console.log('🔧 Corrections nécessaires avant de continuer');
}
