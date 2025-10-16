/**
 * Utilitaires pour la gestion des informations utilisateur
 * Version simplifiée utilisant Firebase Auth uniquement
 */

import { auth } from '../services/firebase-config';

export interface UserInfo {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
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
    
    return {
      uid: currentUser.uid,
      email: currentUser.email!,
      displayName: currentUser.displayName || currentUser.email!,
      firstName: currentUser.displayName?.split(' ')[0],
      lastName: currentUser.displayName?.split(' ')[1],
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
    };
  }
  
  return {
    created_by: user.uid,
    created_by_name: user.email,
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
  
  return resources.filter(resource => resource.created_by === user.uid);
};
