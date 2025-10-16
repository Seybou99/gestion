import {
    detectCountryFromPhone,
    formatPhoneNumber,
    getSupportedCountries,
    validatePhoneNumber,
} from '../phoneValidation';

describe('Phone Validation Utils', () => {
  describe('validatePhoneNumber', () => {
    it('devrait valider un numéro français correct', () => {
      const result = validatePhoneNumber('+33612345678', 'FR');
      expect(result.isValid).toBe(true);
      expect(result.formattedNumber).toBe('+33612345678');
    });

    it('devrait valider un numéro malien correct', () => {
      const result = validatePhoneNumber('+22361234567', 'ML');
      expect(result.isValid).toBe(true);
      expect(result.formattedNumber).toBe('+22361234567');
    });

    it('devrait valider un numéro américain correct', () => {
      const result = validatePhoneNumber('+12125551234', 'US');
      expect(result.isValid).toBe(true);
      expect(result.formattedNumber).toBe('+12125551234');
    });

    it('devrait rejeter un numéro trop court', () => {
      const result = validatePhoneNumber('+3361234', 'FR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Format invalide pour France');
    });

    it('devrait rejeter un numéro trop long', () => {
      const result = validatePhoneNumber('+336123456789012345', 'FR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Format invalide pour France');
    });

    it('devrait accepter un numéro sans indicatif pays (format local)', () => {
      const result = validatePhoneNumber('0612345678', 'FR');
      expect(result.isValid).toBe(true); // Le format local est accepté
    });

    it('devrait rejeter un numéro avec mauvais indicatif pays', () => {
      const result = validatePhoneNumber('+1234567890', 'FR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Format invalide pour France');
    });

    it('devrait rejeter un numéro avec caractères non numériques', () => {
      const result = validatePhoneNumber('+3361234567a', 'FR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Format invalide pour France');
    });

    it('devrait rejeter un pays non supporté', () => {
      const result = validatePhoneNumber('+33612345678', 'XX');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Code pays non supporté: XX');
    });
  });

  describe('formatPhoneNumber', () => {
    it('devrait formater un numéro français', () => {
      expect(formatPhoneNumber('+33612345678', 'FR')).toBe('+33 6 12 34 56 78');
      expect(formatPhoneNumber('+33123456789', 'FR')).toBe('+33 1 23 45 67 89');
    });

    it('devrait formater un numéro malien', () => {
      expect(formatPhoneNumber('+22361234567', 'ML')).toBe('+22361234567'); // Pas de formatage spécial pour le Mali
    });

    it('devrait formater un numéro américain', () => {
      expect(formatPhoneNumber('+12125551234', 'US')).toBe('+1 (212) 555-1234');
    });

    it('devrait retourner le numéro tel quel si le pays n\'est pas supporté', () => {
      expect(formatPhoneNumber('+33612345678', 'XX')).toBe('+33612345678');
    });
  });

  describe('detectCountryFromPhone', () => {
    it('devrait détecter la France pour un numéro français', () => {
      const country = detectCountryFromPhone('+33612345678');
      expect(country).toBe('FR');
    });

    it('devrait détecter le Mali pour un numéro malien', () => {
      const country = detectCountryFromPhone('+22361234567');
      expect(country).toBe('ML');
    });

    it('devrait retourner null pour un numéro invalide', () => {
      const country = detectCountryFromPhone('invalid');
      expect(country).toBeNull();
    });
  });

  describe('getSupportedCountries', () => {
    it('devrait retourner une liste de pays supportés', () => {
      const countries = getSupportedCountries();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
      
      // Vérifier quelques pays clés
      expect(countries).toContain('FR');
      expect(countries).toContain('ML');
      expect(countries).toContain('US');
    });

    it('devrait contenir des codes pays valides', () => {
      const countries = getSupportedCountries();
      const france = countries.find(c => c === 'FR');
      expect(france).toBe('FR');
      
      const mali = countries.find(c => c === 'ML');
      expect(mali).toBe('ML');
    });
  });

  describe('Tests d\'intégration', () => {
    it('devrait valider et formater un numéro complet', () => {
      const phoneNumber = '+33612345678';
      const countryCode = 'FR';
      
      // Validation
      const validation = validatePhoneNumber(phoneNumber, countryCode);
      expect(validation.isValid).toBe(true);
      
      // Formatage
      const formatted = formatPhoneNumber(phoneNumber, countryCode);
      expect(formatted).toBe('+33 6 12 34 56 78');
      
      // Détection automatique
      const detectedCountry = detectCountryFromPhone(phoneNumber);
      expect(detectedCountry).toBe('FR');
    });
  });
});