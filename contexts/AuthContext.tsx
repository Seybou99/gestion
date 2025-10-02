import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiService, User } from '../services/api';

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

  // Vérifier si l'utilisateur est connecté au démarrage
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Tester d'abord la connectivité réseau
      console.log('🔍 Test de connectivité réseau...');
      const isConnected = await apiService.testConnectivity();
      
      if (!isConnected) {
        //console.error('❌ Pas de connexion réseau disponible');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Vérifier d'abord si un token existe
      const token = await apiService.getToken();
      
      if (!token) {
        setUser(null);
        return;
      }
      
      // Si un token existe, vérifier sa validité
      const response = await apiService.verifyToken();
      
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setUser(null);
        // Supprimer le token invalide
        await apiService.logout();
      }
    } catch (error) {
      //console.error('Erreur vérification auth:', error);
      setUser(null);
      // Supprimer le token en cas d'erreur
      try {
        await apiService.logout();
      } catch (logoutError) {
        //console.error('Erreur lors de la suppression du token:', logoutError);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiService.login({ email, password });
      
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Erreur de connexion' };
      }
    } catch (error: any) {
      //console.error('Erreur login:', error);
      return { 
        success: false, 
        message: error.message || 'Erreur lors de la connexion' 
      };
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
      const response = await apiService.register(userData);
      
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Erreur d\'inscription' };
      }
    } catch (error: any) {
      //console.error('Erreur register:', error);
      return { 
        success: false, 
        message: error.message || 'Erreur lors de l\'inscription' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
    } catch (error) {
      //console.error('Erreur logout:', error);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await apiService.updateProfile(profileData);
      
      if (response.success && user) {
        setUser({ ...user, ...profileData });
      }
      
      return { success: response.success, message: response.message };
    } catch (error: any) {
      //console.error('Erreur updateProfile:', error);
      return { 
        success: false, 
        message: error.message || 'Erreur lors de la mise à jour du profil' 
      };
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const response = await apiService.changePassword(newPassword);
      return { success: response.success, message: response.message };
    } catch (error: any) {
      //console.error('Erreur changePassword:', error);
      return { 
        success: false, 
        message: error.message || 'Erreur lors du changement de mot de passe' 
      };
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await apiService.deleteAccount();
      
      if (response.success) {
        setUser(null);
      }
      
      return { success: response.success, message: response.message };
    } catch (error: any) {
      //console.error('Erreur deleteAccount:', error);
      return { 
        success: false, 
        message: error.message || 'Erreur lors de la suppression du compte' 
      };
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
