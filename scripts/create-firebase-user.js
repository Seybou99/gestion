/**
 * Script pour créer un utilisateur dans Firebase Auth
 * à partir d'un utilisateur existant dans votre backend
 * 
 * Usage:
 *   node create-firebase-user.js email@example.com motdepasse
 */

// Utiliser la configuration Firebase Admin
const { admin, auth } = require('./firebase-admin-config');

async function createFirebaseUser(email, password) {
  try {
    console.log('🔐 Création de l\'utilisateur dans Firebase Auth...');
    console.log('📧 Email:', email);
    
    // Vérifier si l'utilisateur existe déjà
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log('⚠️ L\'utilisateur existe déjà dans Firebase Auth');
      console.log('✅ UID Firebase:', existingUser.uid);
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Nom:', existingUser.displayName || 'Non défini');
      console.log('📅 Créé le:', new Date(existingUser.metadata.creationTime).toLocaleString());
      
      // Demander si on veut réinitialiser le mot de passe
      console.log('\n💡 Pour réinitialiser le mot de passe, utilisez:');
      console.log(`   node reset-firebase-password.js ${email} nouveaumotdepasse`);
      
      return existingUser;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      // L'utilisateur n'existe pas, on le crée
    }
    
    // Créer l'utilisateur
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true, // Marquer comme vérifié automatiquement
    });
    
    console.log('✅ Utilisateur créé avec succès !');
    console.log('🆔 UID Firebase:', userRecord.uid);
    console.log('📧 Email:', userRecord.email);
    console.log('📅 Créé le:', new Date(userRecord.metadata.creationTime).toLocaleString());
    
    console.log('\n🎉 Vous pouvez maintenant vous connecter dans l\'application !');
    console.log('📱 Email:', email);
    console.log('🔑 Mot de passe:', password);
    
    return userRecord;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code) {
      console.error('Code d\'erreur:', error.code);
    }
    throw error;
  }
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('❌ Usage incorrect');
  console.log('');
  console.log('Usage:');
  console.log('  node create-firebase-user.js EMAIL MOTDEPASSE');
  console.log('');
  console.log('Exemple:');
  console.log('  node create-firebase-user.js user@example.com Password123!');
  console.log('');
  process.exit(1);
}

const [email, password] = args;

// Valider l'email
if (!email.includes('@')) {
  console.error('❌ Email invalide');
  process.exit(1);
}

// Valider le mot de passe
if (password.length < 6) {
  console.error('❌ Le mot de passe doit contenir au moins 6 caractères');
  process.exit(1);
}

// Exécuter la création
createFirebaseUser(email, password)
  .then(() => {
    console.log('\n✅ Opération terminée avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec de l\'opération');
    process.exit(1);
  });

