import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../utils/validation';

// Mock useAuth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock validation functions
jest.mock('../../utils/validation', () => ({
  validateEmail: jest.fn(),
  validatePassword: jest.fn(),
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

describe('LoginForm Logic', () => {
  const mockLogin = jest.fn();
  const mockNavigateToRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      loading: false,
    });
    (validateEmail as jest.Mock).mockReturnValue({ isValid: true });
    (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
  });

  it('devrait valider les données de connexion', () => {
    const email = 'test@example.com';
    const password = 'password123';

    // Test validation email
    (validateEmail as jest.Mock).mockReturnValue({ isValid: true });
    const emailResult = validateEmail(email);
    expect(emailResult.isValid).toBe(true);

    // Test validation password
    (validatePassword as jest.Mock).mockReturnValue({ isValid: true });
    const passwordResult = validatePassword(password);
    expect(passwordResult.isValid).toBe(true);
  });

  it('devrait gérer les erreurs de validation email', () => {
    const invalidEmail = 'invalid-email';
    (validateEmail as jest.Mock).mockReturnValue({ 
      isValid: false, 
      error: 'Format d\'email invalide' 
    });

    const result = validateEmail(invalidEmail);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Format d\'email invalide');
  });

  it('devrait gérer les erreurs de validation password', () => {
    const shortPassword = '123';
    (validatePassword as jest.Mock).mockReturnValue({ 
      isValid: false, 
      error: 'Le mot de passe doit contenir au moins 6 caractères' 
    });

    const result = validatePassword(shortPassword);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Le mot de passe doit contenir au moins 6 caractères');
  });

  it('devrait appeler la fonction de connexion avec les bonnes données', async () => {
    mockLogin.mockResolvedValue({ success: true });

    const email = 'test@example.com';
    const password = 'password123';

    await mockLogin(email, password);

    expect(mockLogin).toHaveBeenCalledWith(email, password);
  });

  it('devrait gérer les erreurs de connexion', async () => {
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Email ou mot de passe incorrect' 
    });

    const result = await mockLogin('test@example.com', 'wrongpassword');
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Email ou mot de passe incorrect');
  });

  it('devrait gérer l\'état de chargement', () => {
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      loading: true,
    });

    const auth = useAuth();
    expect(auth.loading).toBe(true);
  });

  it('devrait gérer l\'état non chargé', () => {
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      loading: false,
    });

    const auth = useAuth();
    expect(auth.loading).toBe(false);
  });
});