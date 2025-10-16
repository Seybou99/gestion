#!/usr/bin/env node

/**
 * Script pour identifier tous les appels Firebase restants
 * qui pourraient causer des erreurs de permissions
 */

const fs = require('fs');
const path = require('path');

function findFirebaseCalls() {
  console.log('🔍 RECHERCHE DE TOUS LES APPELS FIREBASE...\n');

  const patterns = [
    'firebaseService\.get',
    'firebaseService\.create',
    'firebaseService\.update',
    'firebaseService\.delete',
    'firebaseService\.',
    'getStock\(\)',
    'getProducts\(\)',
    'getCategories\(\)',
    'getCustomers\(\)',
    'getSales\(\)',
    'getUpdatesSince',
    'syncCategoriesToLocal',
    'syncFirebaseToLocal',
    'firebaseService',
  ];

  const directories = [
    'app',
    'components',
    'services',
    'utils',
    'contexts',
    'store',
  ];

  let totalMatches = 0;

  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📂 Recherche dans ${dir}/...`);
      
      const files = getAllFiles(dir);
      let dirMatches = 0;

      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');
          
          patterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'g');
            const matches = content.match(regex);
            
            if (matches) {
              console.log(`   📄 ${file}`);
              console.log(`      🔍 Pattern: ${pattern}`);
              console.log(`      📊 Occurrences: ${matches.length}`);
              console.log(`      📝 Matches: ${matches.join(', ')}`);
              console.log('');
              
              dirMatches += matches.length;
              totalMatches += matches.length;
            }
          });
        }
      });

      if (dirMatches > 0) {
        console.log(`   📊 Total pour ${dir}/: ${dirMatches} occurrences\n`);
      }
    }
  });

  console.log('='.repeat(60));
  console.log('📊 RÉSUMÉ :');
  console.log('='.repeat(60));
  console.log(`🔍 Total d'occurrences trouvées: ${totalMatches}`);
  console.log('='.repeat(60));
}

function getAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  });
  
  return files;
}

// Exécuter la recherche
findFirebaseCalls();
