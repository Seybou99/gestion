import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('devrait utiliser l\'URL de base correcte', () => {
      expect(apiService['baseURL']).toBe('http://192.168.1.200:3000');
    });

    it('devrait être en mode mock par défaut', () => {
      expect(apiService['mockMode']).toBe(true);
    });
  });

  describe('Mode Mock', () => {
    it('devrait activer le mode mock', () => {
      apiService.setMockMode(true);
      expect(apiService['mockMode']).toBe(true);
    });

    it('devrait désactiver le mode mock', () => {
      apiService.setMockMode(false);
      expect(apiService['mockMode']).toBe(false);
    });
  });

  describe('Gestion des tokens', () => {
    it('devrait récupérer le token depuis AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');
      
      const token = await apiService.getToken();
      
      expect(token).toBe('test-token');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('authToken');
    });

    it('devrait retourner null si aucun token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const token = await apiService.getToken();
      
      expect(token).toBeNull();
    });
  });

  describe('Déconnexion', () => {
    it('devrait déconnecter l\'utilisateur avec succès', async () => {
      await apiService.logout();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const token = await apiService.getToken();
      
      expect(token).toBeNull();
    });
  });

  describe('Tests d\'intégration', () => {
    it('devrait effectuer une déconnexion complète', async () => {
      // Simuler un token existant
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');
      
      await apiService.logout();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });
});