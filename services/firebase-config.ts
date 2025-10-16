// Configuration Firebase pour le client (frontend)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBN03T7NIGfuxvQdr6gh6jcnN7lmqgck_8",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "gestion-94304.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "gestion-94304",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "gestion-94304.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "702146492008",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:702146492008:web:2ac064106c5c830eb1eddd",
  measurementId: "G-SKW2KD9XTB"
};

// Configuration de l'environnement
export const FIREBASE_ENABLED = process.env.EXPO_PUBLIC_FIREBASE_ENABLED !== 'false';
export const FIREBASE_TIMEOUT = 3000; // 3 secondes au lieu de 5
export const FIREBASE_RETRY_COUNT = 1; // Moins de tentatives

// Mode test offline (pour développement) - DÉSACTIVÉ PAR DÉFAUT
export let FORCE_OFFLINE_MODE = false;

export const setOfflineMode = (offline: boolean) => {
  FORCE_OFFLINE_MODE = offline;
  console.log(`🌐 Mode ${offline ? 'OFFLINE' : 'ONLINE'} activé manuellement`);
};

// Forcer le mode ONLINE au démarrage
setOfflineMode(false);
console.log('🌐 Mode ONLINE forcé au démarrage de l\'application');

console.log('🔥 Configuration Firebase:', {
  enabled: FIREBASE_ENABLED,
  timeout: FIREBASE_TIMEOUT,
  retryCount: FIREBASE_RETRY_COUNT
});

// Initialiser Firebase seulement si activé
let app: any = null;
let db: any = null;
let auth: any = null;
let analytics: any = null;

if (FIREBASE_ENABLED) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Initialiser Auth avec persistance AsyncStorage pour React Native
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('🔑 Firebase Auth initialisé avec persistance AsyncStorage');
    
    // Initialiser Analytics seulement sur web et si supporté
    try {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        analytics = getAnalytics(app);
        console.log('📊 Firebase Analytics initialisé');
      } else {
        console.log('📊 Firebase Analytics non supporté sur cette plateforme');
      }
    } catch (error) {
      console.log('📊 Firebase Analytics non disponible:', error instanceof Error ? error.message : 'Erreur inconnue');
    }
    
    console.log('🔥 Firebase initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
    console.log('📱 Mode local uniquement activé');
  }
} else {
  console.log('📱 Firebase désactivé - Mode local uniquement');
}

// Exporter les services Firebase
export { analytics, auth, db };

export default app;