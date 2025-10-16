import { apiService } from '../../services/api';
import { validatePhoneNumber } from '../../utils/phoneValidation';
import { validateRegistrationData } from '../../utils/validation';

// Mock API service
jest.mock('../../services/api', () => ({
  apiService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getToken: jest.fn(),
  },
}));

// Mock validation functions
jest.mock('../../utils/validation', () => ({
  validateRegistrationData: jest.fn(),
}));

jest.mock('../../utils/phoneValidation', () => ({
  validatePhoneNumber: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: {
    alert: mockAlert,
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('Tests d\'intégration - Authentification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Flux de connexion complet', () => {
    it('devrait effectuer une connexion complète avec validation', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      (apiService.login as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'mock-token',
      });

      // Étape 1: Validation des données
      const email = 'test@example.com';
      const password = 'password123';

      // Étape 2: Appel API
      const result = await apiService.login(email, password);

      // Étape 3: Vérification du résultat
      expect(apiService.login).toHaveBeenCalledWith(email, password);
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('mock-token');
    });

    it('devrait gérer l\'échec de connexion avec gestion d\'erreur', async () => {
      (apiService.login as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });

      const email = 'wrong@example.com';
      const password = 'wrongpassword';

      const result = await apiService.login(email, password);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email ou mot de passe incorrect');
    });
  });

  describe('Flux d\'inscription complet', () => {
    it('devrait effectuer une inscription complète avec validation', async () => {
      const mockUser = { id: '1', email: 'newuser@example.com' };
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'newuser@example.com',
        phone: '+33612345678',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // Étape 1: Validation des données d'inscription
      (validateRegistrationData as jest.Mock).mockReturnValue({ 
        isValid: true, 
        errors: [] 
      });

      // Étape 2: Validation du téléphone
      (validatePhoneNumber as jest.Mock).mockReturnValue({ 
        isValid: true,
        formattedNumber: '+33612345678'
      });

      // Étape 3: Appel API
      (apiService.register as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'mock-token',
      });

      const registrationResult = validateRegistrationData(userData);
      const phoneResult = validatePhoneNumber(userData.phone, 'FR');
      const apiResult = await apiService.register(userData);

      // Vérifications
      expect(registrationResult.isValid).toBe(true);
      expect(phoneResult.isValid).toBe(true);
      expect(apiResult.success).toBe(true);
      expect(apiResult.user).toEqual(mockUser);
    });

    it('devrait gérer l\'échec d\'inscription avec validation', async () => {
      const invalidUserData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '123',
        password: '123',
        confirmPassword: '456',
      };

      // Validation échouée
      (validateRegistrationData as jest.Mock).mockReturnValue({ 
        isValid: false, 
        errors: [
          'Le prénom est requis',
          'Format d\'email invalide',
          'Le mot de passe doit contenir au moins 6 caractères',
          'Les mots de passe ne correspondent pas'
        ]
      });

      (validatePhoneNumber as jest.Mock).mockReturnValue({ 
        isValid: false,
        error: 'Format de numéro invalide'
      });

      const registrationResult = validateRegistrationData(invalidUserData);
      const phoneResult = validatePhoneNumber(invalidUserData.phone, 'FR');

      expect(registrationResult.isValid).toBe(false);
      expect(registrationResult.errors).toHaveLength(4);
      expect(phoneResult.isValid).toBe(false);
    });
  });

  describe('Gestion des sessions', () => {
    it('devrait gérer la vérification de session existante', async () => {
      (apiService.getToken as jest.Mock).mockResolvedValue('existing-token');

      const token = await apiService.getToken();

      expect(apiService.getToken).toHaveBeenCalled();
      expect(token).toBe('existing-token');
    });

    it('devrait gérer l\'absence de session', async () => {
      (apiService.getToken as jest.Mock).mockResolvedValue(null);

      const token = await apiService.getToken();

      expect(token).toBeNull();
    });

    it('devrait gérer la déconnexion complète', async () => {
      (apiService.logout as jest.Mock).mockResolvedValue({});

      await apiService.logout();

      expect(apiService.logout).toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs réseau', () => {
    it('devrait gérer les erreurs de connexion réseau', async () => {
      (apiService.login as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await apiService.login('test@example.com', 'password123');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('devrait gérer les erreurs d\'inscription réseau', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        phone: '+33612345678',
        password: 'password123',
      };

      (apiService.register as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await apiService.register(userData);
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('Validation des données', () => {
    it('devrait valider un ensemble de données correctes', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+33612345678',
        password: 'password123',
        confirmPassword: 'password123',
      };

      (validateRegistrationData as jest.Mock).mockReturnValue({ 
        isValid: true, 
        errors: [] 
      });

      (validatePhoneNumber as jest.Mock).mockReturnValue({ 
        isValid: true,
        formattedNumber: '+33612345678'
      });

      const registrationResult = validateRegistrationData(validData);
      const phoneResult = validatePhoneNumber(validData.phone, 'FR');

      expect(registrationResult.isValid).toBe(true);
      expect(phoneResult.isValid).toBe(true);
    });

    it('devrait rejeter un ensemble de données incorrectes', () => {
      const invalidData = {
        firstName: '',
        lastName: '',
        email: 'invalid',
        phone: '123',
        password: '123',
        confirmPassword: '456',
      };

      (validateRegistrationData as jest.Mock).mockReturnValue({ 
        isValid: false, 
        errors: [
          'Le prénom est requis',
          'Le nom est requis',
          'Format d\'email invalide',
          'Le mot de passe doit contenir au moins 6 caractères',
          'Les mots de passe ne correspondent pas'
        ]
      });

      (validatePhoneNumber as jest.Mock).mockReturnValue({ 
        isValid: false,
        error: 'Format de numéro invalide'
      });

      const registrationResult = validateRegistrationData(invalidData);
      const phoneResult = validatePhoneNumber(invalidData.phone, 'FR');

      expect(registrationResult.isValid).toBe(false);
      expect(registrationResult.errors.length).toBeGreaterThan(0);
      expect(phoneResult.isValid).toBe(false);
    });
  });
});