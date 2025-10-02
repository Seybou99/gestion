import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration de l'API - Connecté à Firebase via le backend new-project
const API_BASE_URL = 'http://192.168.1.200:3000'; // Backend Firebase actif - IP réseau local

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  user?: T;
  token?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt?: Date;
  profile?: {
    avatar?: string;
    bio?: string;
    preferences?: any;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Classe pour gérer les appels API
class ApiService {
  private baseURL: string;
  private mockMode: boolean = true; // Mode mock pour tester sans backend

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Méthode pour activer/désactiver le mode mock
  setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  // Méthode pour obtenir le token depuis AsyncStorage
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      //console.error('Erreur récupération token:', error);
      return null;
    }
  }

  // Méthode pour sauvegarder le token
  private async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      //console.error('Erreur sauvegarde token:', error);
    }
  }

  // Méthode pour supprimer le token
  private async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      //console.error('Erreur suppression token:', error);
    }
  }

  // Méthode générique pour les appels API
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken();
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur API');
      }

      return data;
    } catch (error) {
      //console.error('Erreur API:', error);
      throw error;
    }
  }

  // Méthodes d'authentification

  // Inscription
  async register(userData: RegisterData): Promise<ApiResponse<User>> {
    const response = await this.request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.token) {
      await this.saveToken(response.token);
    }

    return response;
  }

  // Connexion
  async login(credentials: LoginData): Promise<ApiResponse<User>> {
    const response = await this.request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token) {
      await this.saveToken(response.token);
    }

    return response;
  }

  // Déconnexion
  async logout(): Promise<void> {
    await this.removeToken();
  }

  // Obtenir le profil utilisateur
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/auth/profile');
  }

  // Mettre à jour le profil
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse> {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Changer le mot de passe
  async changePassword(newPassword: string): Promise<ApiResponse> {
    return this.request('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  }

  // Supprimer le compte
  async deleteAccount(): Promise<ApiResponse> {
    const response = await this.request('/api/auth/account', {
      method: 'DELETE',
    });

    if (response.success) {
      await this.removeToken();
    }

    return response;
  }

  // Vérifier le token
  async verifyToken(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/auth/verify-token');
  }

  // Vérifier la santé du serveur
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Tester la connectivité avec différentes URLs
  async testConnectivity(): Promise<boolean> {
    if (this.mockMode) {
      console.log('🔧 Mode mock activé - Pas de connexion backend requise');
      return true;
    }

    const fallbackUrls = [
      'http://localhost:3000',
      'http://192.168.1.100:3000', // Remplacez par votre IP locale
      'https://your-backend-url.herokuapp.com', // Remplacez par votre URL de production
    ];
    
    for (const url of fallbackUrls) {
      try {
        console.log(`Test de connectivité vers: ${url}`);
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          timeout: 5000,
        });
        
        if (response.ok) {
          console.log(`✅ Connexion réussie vers: ${url}`);
          // Mettre à jour l'URL de base si elle fonctionne
          if (url !== this.baseURL) {
            this.baseURL = url;
            console.log(`🔄 URL de base mise à jour vers: ${url}`);
          }
          return true;
        }
      } catch (error: any) {
        console.log(`❌ Échec de connexion vers: ${url}`, error.message);
      }
    }
    
    //console.error('❌ Aucune connexion disponible - Activation du mode mock');
    this.mockMode = true; // Activer le mode mock automatiquement
    return true;
  }
}

// Instance singleton
export const apiService = new ApiService();
export default apiService;
