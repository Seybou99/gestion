import {
    validateEmail,
    validateLoginData,
    validateName,
    validatePassword,
    validateProfileData,
    validateRegistrationData,
} from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('devrait valider un email correct', () => {
      expect(validateEmail('test@example.com')).toEqual({ isValid: true });
      expect(validateEmail('user.name+tag@domain.co.uk')).toEqual({ isValid: true });
      expect(validateEmail('user123@test-domain.com')).toEqual({ isValid: true });
    });

    it('devrait rejeter un email invalide', () => {
      expect(validateEmail('')).toEqual({ isValid: false, error: 'L\'email est requis' });
      expect(validateEmail('invalid-email')).toEqual({ isValid: false, error: 'Format d\'email invalide' });
      expect(validateEmail('test@')).toEqual({ isValid: false, error: 'Format d\'email invalide' });
      expect(validateEmail('@domain.com')).toEqual({ isValid: false, error: 'Format d\'email invalide' });
      expect(validateEmail('test@domain')).toEqual({ isValid: false, error: 'Format d\'email invalide' });
    });
  });

  describe('validatePassword', () => {
    it('devrait valider un mot de passe correct', () => {
      expect(validatePassword('password123')).toEqual({ isValid: true });
      expect(validatePassword('MySecure123!')).toEqual({ isValid: true });
      expect(validatePassword('123456')).toEqual({ isValid: true });
    });

    it('devrait rejeter un mot de passe trop court', () => {
      expect(validatePassword('12345')).toEqual({ isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
      expect(validatePassword('')).toEqual({ isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
      expect(validatePassword('abc')).toEqual({ isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
    });
  });

  describe('validateName', () => {
    it('devrait valider un nom correct', () => {
      expect(validateName('John')).toEqual({ isValid: true });
      expect(validateName('Marie-Claire')).toEqual({ isValid: true });
      expect(validateName('Jean-Pierre')).toEqual({ isValid: true });
      expect(validateName('O\'Connor')).toEqual({ isValid: true });
    });

    it('devrait rejeter un nom invalide', () => {
      expect(validateName('')).toEqual({ isValid: false, error: 'Le nom doit contenir au moins 2 caractères' });
      expect(validateName('A')).toEqual({ isValid: false, error: 'Le nom doit contenir au moins 2 caractères' });
      expect(validateName('123')).toEqual({ isValid: true }); // Les chiffres sont acceptés
      expect(validateName('John123')).toEqual({ isValid: true }); // Les chiffres sont acceptés
      expect(validateName('John@Doe')).toEqual({ isValid: true }); // Les caractères spéciaux sont acceptés
    });
  });

  describe('validateRegistrationData', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('devrait valider des données d\'inscription correctes', () => {
      const result = validateRegistrationData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter des données avec prénom manquant', () => {
      const data = { ...validData, firstName: '' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nom doit contenir au moins 2 caractères');
    });

    it('devrait rejeter des données avec nom manquant', () => {
      const data = { ...validData, lastName: '' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nom doit contenir au moins 2 caractères');
    });

    it('devrait rejeter des données avec email invalide', () => {
      const data = { ...validData, email: 'invalid-email' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Format d\'email invalide');
    });

    it('devrait rejeter des données avec mot de passe trop court', () => {
      const data = { ...validData, password: '123' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins 6 caractères');
    });

    it('devrait rejeter des données avec mots de passe non correspondants', () => {
      const data = { ...validData, confirmPassword: 'different123' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Les mots de passe ne correspondent pas');
    });

    it('devrait accepter des données avec prénom contenant des chiffres', () => {
      const data = { ...validData, firstName: 'John123' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(true); // Les chiffres sont acceptés dans les noms
    });

    it('devrait accepter des données avec nom contenant des caractères spéciaux', () => {
      const data = { ...validData, lastName: 'Doe@' };
      const result = validateRegistrationData(data);
      expect(result.isValid).toBe(true); // Les caractères spéciaux sont acceptés dans les noms
    });
  });

  describe('validateLoginData', () => {
    const validData = {
      email: 'john.doe@example.com',
      password: 'password123',
    };

    it('devrait valider des données de connexion correctes', () => {
      const result = validateLoginData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait rejeter des données avec email manquant', () => {
      const data = { ...validData, email: '' };
      const result = validateLoginData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('L\'email est requis');
    });

    it('devrait rejeter des données avec mot de passe manquant', () => {
      const data = { ...validData, password: '' };
      const result = validateLoginData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mot de passe requis');
    });

    it('devrait rejeter des données avec email invalide', () => {
      const data = { ...validData, email: 'invalid-email' };
      const result = validateLoginData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Format d\'email invalide');
    });
  });

  describe('validateProfileData', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
    };

    it('devrait valider des données de profil correctes', () => {
      const result = validateProfileData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait valider des données avec prénom vide (optionnel)', () => {
      const data = { ...validData, firstName: '' };
      const result = validateProfileData(data);
      expect(result.isValid).toBe(true); // Les champs sont optionnels
    });

    it('devrait valider des données avec nom vide (optionnel)', () => {
      const data = { ...validData, lastName: '' };
      const result = validateProfileData(data);
      expect(result.isValid).toBe(true); // Les champs sont optionnels
    });

    it('devrait accepter des données avec prénom contenant des chiffres', () => {
      const data = { ...validData, firstName: 'John123' };
      const result = validateProfileData(data);
      expect(result.isValid).toBe(true); // Les chiffres sont acceptés
    });

    it('devrait accepter des données avec nom contenant des caractères spéciaux', () => {
      const data = { ...validData, lastName: 'Doe@' };
      const result = validateProfileData(data);
      expect(result.isValid).toBe(true); // Les caractères spéciaux sont acceptés
    });
  });
});
