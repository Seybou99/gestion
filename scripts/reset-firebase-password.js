/**
 * Script pour réinitialiser le mot de passe d'un utilisateur Firebase Auth
 * 
 * Usage:
 *   node reset-firebase-password.js email@example.com nouveaumotdepasse
 */

// Utiliser la configuration Firebase Admin
const { auth } = require('./firebase-admin-config');

async function resetPassword(email, newPassword) {
  try {
    console.log('🔐 Réinitialisation du mot de passe Firebase...');
    console.log('📧 Email:', email);
    
    // Vérifier que l'utilisateur existe
    const user = await auth.getUserByEmail(email);
    console.log('✅ Utilisateur trouvé');
    console.log('🆔 UID:', user.uid);
    
    // Mettre à jour le mot de passe
    await auth.updateUser(user.uid, {
      password: newPassword
    });
    
    console.log('✅ Mot de passe mis à jour avec succès !');
    console.log('');
    console.log('🎉 Vous pouvez maintenant vous connecter avec :');
    console.log('📱 Email:', email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('');
    console.log('⚠️  IMPORTANT : Utilisez ce MÊME mot de passe dans le backend aussi !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('💡 L\'utilisateur n\'existe pas. Créez-le d\'abord avec :');
      console.error(`   node create-firebase-user.js ${email} ${newPassword}`);
    }
    throw error;
  }
}

// Récupérer les arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('❌ Usage incorrect');
  console.log('');
  console.log('Usage:');
  console.log('  node reset-firebase-password.js EMAIL NOUVEAU_MOT_DE_PASSE');
  console.log('');
  console.log('Exemple:');
  console.log('  node reset-firebase-password.js user@example.com Password123!');
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

// Exécuter
resetPassword(email, password)
  .then(() => {
    console.log('✅ Opération terminée avec succès');
    process.exit(0);
  })
  .catch(() => {
    console.log('❌ Échec de l\'opération');
    process.exit(1);
  });

