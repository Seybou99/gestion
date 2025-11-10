/**
 * Utilitaires pour la gestion des informations utilisateur
 * Version simplifiée utilisant Firebase Auth uniquement
 */

import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase-config';

export interface UserInfo {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: string | null;
  managedBy?: string | null;
  managedUsers?: string[];
  accountOwnerId: string;
  allowedOwnerIds: string[];
}

/**
 * Récupère les informations de l'utilisateur connecté depuis Firebase Auth
 */
export const getCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log('ℹ️ Aucun utilisateur Firebase Auth connecté');
      return null;
    }
    
    console.log('👤 Utilisateur Firebase Auth:', currentUser.email, 'UID:', currentUser.uid);
    let profileData: any = null;

    if (db) {
      try {
        const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
        if (snapshot.exists()) {
          profileData = snapshot.data();
        }
      } catch (profileError) {
        console.log('⚠️ Impossible de charger le profil Firestore:', profileError);
      }
    }

    const managedBy = profileData?.managed_by ?? null;
    const managedUsers = Array.isArray(profileData?.managed_users)
      ? profileData.managed_users.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    const role = profileData?.role ?? (managedBy ? 'vendeur' : 'admin');

    const accountOwnerId = managedBy || currentUser.uid;
    const allowedOwnerIds = Array.from(
      new Set([
        currentUser.uid,
        accountOwnerId,
        ...(managedUsers || []),
      ])
    );

    return {
      uid: currentUser.uid,
      email: currentUser.email!,
      displayName: currentUser.displayName || currentUser.email!,
      firstName: currentUser.displayName?.split(' ')[0],
      lastName: currentUser.displayName?.split(' ')[1],
      role,
      managedBy,
      managedUsers,
      accountOwnerId,
      allowedOwnerIds,
    };
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    return null;
  }
};

/**
 * Génère les champs created_by pour les nouvelles données
 */
export const generateCreatedByFields = async () => {
  const user = await getCurrentUser();
  
  if (!user) {
    console.warn('⚠️ Aucun utilisateur connecté, impossible de générer created_by');
    return {
      created_by: 'anonymous',
      created_by_name: 'Anonyme',
      created_by_user_id: 'anonymous',
    };
  }
  
  return {
    created_by: user.accountOwnerId,
    created_by_name: user.email,
    created_by_user_id: user.uid,
  };
};

/**
 * Vérifie si l'utilisateur peut accéder à une ressource
 */
export const canAccessResource = async (resourceCreatedBy: string): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // L'utilisateur peut accéder à ses propres ressources
  return resourceCreatedBy === user.uid;
};

/**
 * Filtre les ressources par utilisateur
 */
export const filterResourcesByUser = async <T extends { created_by?: string }>(
  resources: T[]
): Promise<T[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  
  return resources.filter(resource => resource.created_by && user.allowedOwnerIds.includes(resource.created_by));
};

/**
 * Récupère la liste des propriétaires dont l'utilisateur peut voir les données
 */
export const getAllowedOwnerIds = async (): Promise<string[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  return user.allowedOwnerIds;
};
