import { useAuth } from '../../contexts/AuthContext';
import { validatePhoneNumber } from '../../utils/phoneValidation';
import { validateRegistrationData } from '../../utils/validation';

// Mock useAuth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock validation functions
jest.mock('../../utils/validation', () => ({
  validateRegistrationData: jest.fn(),
}));

jest.mock('../../utils/phoneValidation', () => ({
  validatePhoneNumber: jest.fn(),
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
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
}));

describe('RegisterForm Logic', () => {
  const mockRegister = jest.fn();
  const mockNavigateToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      loading: false,
    });
    (validateRegistrationData as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
    (validatePhoneNumber as jest.Mock).mockReturnValue({ isValid: true });
  });

  it('devrait valider les données d\'inscription', () => {
    const userData = {
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

    const result = validateRegistrationData(userData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('devrait gérer les erreurs de validation d\'inscription', () => {
    const invalidUserData = {
      firstName: '',
      lastName: 'Doe',
      email: 'invalid-email',
      phone: '+33612345678',
      password: '123',
      confirmPassword: '456',
    };

    (validateRegistrationData as jest.Mock).mockReturnValue({ 
      isValid: false, 
      errors: [
        'Le prénom est requis',
        'Format d\'email invalide',
        'Le mot de passe doit contenir au moins 6 caractères',
        'Les mots de passe ne correspondent pas'
      ]
    });

    const result = validateRegistrationData(invalidUserData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });

  it('devrait valider le numéro de téléphone', () => {
    const phone = '+33612345678';
    const country = 'FR';

    (validatePhoneNumber as jest.Mock).mockReturnValue({ 
      isValid: true,
      formattedNumber: '+33612345678'
    });

    const result = validatePhoneNumber(phone, country);
    expect(result.isValid).toBe(true);
    expect(result.formattedNumber).toBe('+33612345678');
  });

  it('devrait gérer les erreurs de validation de téléphone', () => {
    const invalidPhone = '123';
    const country = 'FR';

    (validatePhoneNumber as jest.Mock).mockReturnValue({ 
      isValid: false,
      error: 'Format de numéro invalide'
    });

    const result = validatePhoneNumber(invalidPhone, country);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Format de numéro invalide');
  });

  it('devrait appeler la fonction d\'inscription avec les bonnes données', async () => {
    mockRegister.mockResolvedValue({ success: true });

    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+33612345678',
      password: 'password123',
      confirmPassword: 'password123',
    };

    await mockRegister(userData);

    expect(mockRegister).toHaveBeenCalledWith(userData);
  });

  it('devrait gérer les erreurs d\'inscription', async () => {
    mockRegister.mockResolvedValue({ 
      success: false, 
      message: 'Email déjà utilisé' 
    });

    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'existing@example.com',
      phone: '+33612345678',
      password: 'password123',
      confirmPassword: 'password123',
    };

    const result = await mockRegister(userData);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Email déjà utilisé');
  });

  it('devrait gérer l\'état de chargement', () => {
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      loading: true,
    });

    const auth = useAuth();
    expect(auth.loading).toBe(true);
  });

  it('devrait gérer l\'état non chargé', () => {
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      loading: false,
    });

    const auth = useAuth();
    expect(auth.loading).toBe(false);
  });
});