// Utilitaires de validation

// Fonction pour valider un email
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'L\'email est requis' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Format d\'email invalide' };
  }

  return { isValid: true };
};

// Fonction pour valider un mot de passe
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password || password.length < 6) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Le mot de passe ne peut pas dépasser 128 caractères' };
  }

  return { isValid: true };
};

// Fonction pour valider un nom
export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: 'Le nom doit contenir au moins 2 caractères' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'Le nom ne peut pas dépasser 50 caractères' };
  }

  return { isValid: true };
};

// Fonction pour valider un numéro de téléphone (format simple)
export const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Optionnel
  }

  // Format simple : au moins 8 chiffres
  const phoneRegex = /^[\+]?[1-9][\d]{7,15}$/;
  const cleanPhone = phone.replace(/\s/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Format de téléphone invalide' };
  }

  return { isValid: true };
};

// Fonction pour valider les données d'inscription
export const validateRegistrationData = (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validation du prénom
  const firstNameValidation = validateName(data.firstName);
  if (!firstNameValidation.isValid) {
    errors.push(firstNameValidation.error || 'Prénom invalide');
  }

  // Validation du nom
  const lastNameValidation = validateName(data.lastName);
  if (!lastNameValidation.isValid) {
    errors.push(lastNameValidation.error || 'Nom invalide');
  }

  // Validation de l'email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error || 'Email invalide');
  }

  // Validation du mot de passe
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.error || 'Mot de passe invalide');
  }

  // Validation de la confirmation du mot de passe
  if (data.password !== data.confirmPassword) {
    errors.push('Les mots de passe ne correspondent pas');
  }

  // Validation du téléphone (optionnel)
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error || 'Téléphone invalide');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Fonction pour valider les données de connexion
export const validateLoginData = (data: {
  email: string;
  password: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validation de l'email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error || 'Email invalide');
  }

  // Validation du mot de passe
  if (!data.password || data.password.length < 1) {
    errors.push('Mot de passe requis');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Fonction pour valider les données de profil
export const validateProfileData = (data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validation du prénom (si fourni)
  if (data.firstName) {
    const firstNameValidation = validateName(data.firstName);
    if (!firstNameValidation.isValid) {
      errors.push(firstNameValidation.error || 'Prénom invalide');
    }
  }

  // Validation du nom (si fourni)
  if (data.lastName) {
    const lastNameValidation = validateName(data.lastName);
    if (!lastNameValidation.isValid) {
      errors.push(lastNameValidation.error || 'Nom invalide');
    }
  }

  // Validation du téléphone (si fourni)
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error || 'Téléphone invalide');
    }
  }

  // Validation de la bio (si fournie)
  if (data.bio && data.bio.length > 500) {
    errors.push('La bio ne peut pas dépasser 500 caractères');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
