// Utilitaires de validation

// Validation email robuste
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

// Validation mot de passe robuste
const validatePassword = (password) => {
  // Au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validation mot de passe simple (pour compatibilité)
const validatePasswordSimple = (password) => {
  return password && password.length >= 6;
};

// Validation téléphone
const validatePhone = (phone) => {
  if (!phone) return true; // Optionnel
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Validation nom/prénom
const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};

// Validation générale des données d'inscription
const validateRegistrationData = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Email invalide');
  }

  if (!data.password || !validatePasswordSimple(data.password)) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }

  if (!data.firstName || !validateName(data.firstName)) {
    errors.push('Le prénom doit contenir entre 2 et 50 caractères');
  }

  if (!data.lastName || !validateName(data.lastName)) {
    errors.push('Le nom doit contenir entre 2 et 50 caractères');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Format de téléphone invalide');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation des données de connexion
const validateLoginData = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Email invalide');
  }

  if (!data.password || data.password.length < 1) {
    errors.push('Mot de passe requis');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation des données de profil
const validateProfileData = (data) => {
  const errors = [];

  if (data.firstName && !validateName(data.firstName)) {
    errors.push('Le prénom doit contenir entre 2 et 50 caractères');
  }

  if (data.lastName && !validateName(data.lastName)) {
    errors.push('Le nom doit contenir entre 2 et 50 caractères');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Format de téléphone invalide');
  }

  if (data.bio && data.bio.length > 500) {
    errors.push('La bio ne peut pas dépasser 500 caractères');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePasswordSimple,
  validatePhone,
  validateName,
  validateRegistrationData,
  validateLoginData,
  validateProfileData
};
