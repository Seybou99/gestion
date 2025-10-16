/**
 * Configuration Firebase Admin pour les scripts
 * Note: Utilise les node_modules du dossier Backend
 */

const path = require('path');
const admin = require(path.join(__dirname, '../Backend/node_modules/firebase-admin'));
require('dotenv').config({ path: path.join(__dirname, '../Backend/.env') });

// Configuration Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "gestion-94304",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_EMAIL ? 
    `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}` : undefined
};

// Initialiser Firebase Admin seulement si pas déjà initialisé
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
    });
    console.log('🔥 Firebase Admin initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error.message);
    console.log('💡 Assurez-vous que le fichier Backend/.env existe avec les bonnes variables');
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth
};

