import {
    createUserWithEmailAndPassword,
    deleteUser,
    updateProfile as firebaseUpdateProfile,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase-config';

// Type User simplifié basé sur Firebase
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; message: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  deleteAccount: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousUid, setPreviousUid] = useState<string | null>(null);

  // Écouter les changements d'état d'authentification Firebase
  useEffect(() => {
    console.log('🔐 [AUTH] Initialisation du listener Firebase Auth');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('✅ [AUTH] Utilisateur Firebase détecté:', firebaseUser.email);
          
          // Vérifier si c'est un nouvel utilisateur (changement d'utilisateur)
          if (previousUid && previousUid !== firebaseUser.uid) {
            console.log('🔄 [AUTH] Changement d\'utilisateur détecté, nettoyage des caches...');
            const { databaseService } = await import('../services/DatabaseService');
            databaseService.invalidateCache();
          }
          setPreviousUid(firebaseUser.uid);
          
          // Récupérer les données supplémentaires depuis Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();
          
          const userInfo: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || userData?.displayName,
            firstName: userData?.firstName,
            lastName: userData?.lastName,
            phone: userData?.phone,
            photoURL: firebaseUser.photoURL || undefined,
          };
          
          setUser(userInfo);
          console.log('✅ [AUTH] Utilisateur chargé:', userInfo.email, 'UID:', userInfo.uid);
        } else {
          console.log('ℹ️ [AUTH] Aucun utilisateur connecté');
          setPreviousUid(null);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ [AUTH] Erreur chargement utilisateur:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('🔌 [AUTH] Déconnexion du listener Firebase Auth');
      unsubscribe();
    };
  }, [previousUid]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 [AUTH] Connexion Firebase pour:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ [AUTH] Connexion réussie:', firebaseUser.email);
      console.log('✅ [AUTH] UID:', firebaseUser.uid);
      
      // Le listener onAuthStateChanged mettra à jour l'état automatiquement
      
      return { 
        success: true, 
        message: 'Connexion réussie !' 
      };
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur connexion:', error.message);
      
      let message = 'Erreur lors de la connexion';
      
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          message = 'Email ou mot de passe incorrect';
          break;
        case 'auth/too-many-requests':
          message = 'Trop de tentatives. Réessayez plus tard.';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur réseau. Vérifiez votre connexion.';
          break;
        default:
          message = error.message;
      }
      
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    try {
      setLoading(true);
      console.log('📝 [AUTH] Inscription Firebase pour:', userData.email);
      
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      const firebaseUser = userCredential.user;
      console.log('✅ [AUTH] Utilisateur Firebase créé:', firebaseUser.uid);
      
      // Mettre à jour le displayName
      await firebaseUpdateProfile(firebaseUser, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });
      
      // Sauvegarder les données supplémentaires dans Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || null,
        displayName: `${userData.firstName} ${userData.lastName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false,
      });
      
      console.log('✅ [AUTH] Profil utilisateur sauvegardé dans Firestore');
      
      // Le listener onAuthStateChanged mettra à jour l'état automatiquement
      
      return { 
        success: true, 
        message: 'Inscription réussie !' 
      };
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur inscription:', error.message);
      
      let message = 'Erreur lors de l\'inscription';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Cet email est déjà utilisé';
          break;
        case 'auth/weak-password':
          message = 'Le mot de passe doit contenir au moins 6 caractères';
          break;
        case 'auth/invalid-email':
          message = 'Email invalide';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur réseau. Vérifiez votre connexion.';
          break;
        default:
          message = error.message;
      }
      
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 [AUTH] Déconnexion Firebase');
      
      // Nettoyer le cache pour éviter que le prochain utilisateur voie les données
      console.log('🧹 [AUTH] Nettoyage du cache local...');
      const { databaseService } = await import('../services/DatabaseService');
      databaseService.invalidateCache();
      
      await signOut(auth);
      setUser(null);
      console.log('✅ [AUTH] Déconnexion réussie');
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur déconnexion:', error.message);
      // Forcer la déconnexion locale même en cas d'erreur
      setUser(null);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      if (!user || !auth.currentUser) {
        return { success: false, message: 'Utilisateur non connecté' };
      }
      
      console.log('✏️ [AUTH] Mise à jour du profil pour:', user.email);
      
      // Mettre à jour Firebase Auth si displayName change
      if (profileData.firstName || profileData.lastName) {
        const newDisplayName = `${profileData.firstName || user.firstName} ${profileData.lastName || user.lastName}`;
        await firebaseUpdateProfile(auth.currentUser, {
          displayName: newDisplayName
        });
      }
      
      // Mettre à jour Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updatedAt: new Date().toISOString(),
      });
      
      // Mettre à jour l'état local
      setUser({ ...user, ...profileData });
      
      console.log('✅ [AUTH] Profil mis à jour');
      
      return { success: true, message: 'Profil mis à jour avec succès' };
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur mise à jour profil:', error.message);
      return { 
        success: false, 
        message: error.message || 'Erreur lors de la mise à jour du profil' 
      };
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      if (!auth.currentUser) {
        return { success: false, message: 'Utilisateur non connecté' };
      }
      
      console.log('🔑 [AUTH] Changement de mot de passe');
      
      await updatePassword(auth.currentUser, newPassword);
      
      console.log('✅ [AUTH] Mot de passe changé');
      
      return { success: true, message: 'Mot de passe changé avec succès' };
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur changement mot de passe:', error.message);
      
      let message = 'Erreur lors du changement de mot de passe';
      
      if (error.code === 'auth/requires-recent-login') {
        message = 'Veuillez vous reconnecter avant de changer votre mot de passe';
      }
      
      return { success: false, message };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user || !auth.currentUser) {
        return { success: false, message: 'Utilisateur non connecté' };
      }
      
      console.log('🗑️ [AUTH] Suppression du compte:', user.email);
      
      // Supprimer le document Firestore
      // Note: Les données de l'utilisateur (products, stock, etc.) peuvent être conservées
      // ou supprimées selon votre logique métier
      
      // Supprimer l'utilisateur Firebase Auth
      await deleteUser(auth.currentUser);
      
      setUser(null);
      
      console.log('✅ [AUTH] Compte supprimé');
      
      return { success: true, message: 'Compte supprimé avec succès' };
    } catch (error: any) {
      console.error('❌ [AUTH] Erreur suppression compte:', error.message);
      
      let message = 'Erreur lors de la suppression du compte';
      
      if (error.code === 'auth/requires-recent-login') {
        message = 'Veuillez vous reconnecter avant de supprimer votre compte';
      }
      
      return { success: false, message };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
