/**
 * Script pour lister tous les utilisateurs Firebase Auth
 */

const { auth } = require('./firebase-admin-config');

async function listUsers() {
  try {
    console.log('👥 Liste des utilisateurs Firebase Auth:\n');
    
    const listUsersResult = await auth.listUsers(10);
    
    if (listUsersResult.users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé\n');
      return;
    }
    
    console.log(`Total utilisateurs: ${listUsersResult.users.length}\n`);
    
    listUsersResult.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Nom: ${user.displayName || 'Non défini'}`);
      console.log(`   Créé: ${new Date(user.metadata.creationTime).toLocaleString()}`);
      console.log(`   Dernière connexion: ${new Date(user.metadata.lastSignInTime).toLocaleString()}`);
      console.log(`   Email vérifié: ${user.emailVerified ? 'Oui' : 'Non'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

listUsers()
  .then(() => {
    console.log('✅ Vérification terminée');
    process.exit(0);
  })
  .catch(() => {
    console.log('❌ Échec de la vérification');
    process.exit(1);
  });

