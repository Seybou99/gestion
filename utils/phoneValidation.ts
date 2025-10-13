// Validation téléphone internationale - Support de 69 pays
// Basé sur l'exemple du projet new-project

// Formats de numéros de téléphone par pays - Support étendu
const phoneFormats: { [key: string]: RegExp } = {
  // Europe
  'FR': /^(\+33|0)[1-9](\d{8})$/, // France
  'DE': /^(\+49|0)[1-9]\d{2,4}\d{6,7}$/, // Allemagne
  'IT': /^(\+39|0)\d{2,3}\d{6,7}$/, // Italie
  'ES': /^(\+34|0)[6-9]\d{8}$/, // Espagne
  'GB': /^(\+44|0)[1-9]\d{8,9}$/, // Royaume-Uni
  'NL': /^(\+31|0)[1-9]\d{8}$/, // Pays-Bas
  'BE': /^(\+32|0)[1-9]\d{7,8}$/, // Belgique
  'CH': /^(\+41|0)[1-9]\d{8}$/, // Suisse
  'AT': /^(\+43|0)[1-9]\d{3,10}$/, // Autriche
  'SE': /^(\+46|0)[1-9]\d{6,8}$/, // Suède
  'NO': /^(\+47|0)[2-9]\d{7}$/, // Norvège
  'DK': /^(\+45|0)[2-9]\d{7}$/, // Danemark
  'FI': /^(\+358|0)[1-9]\d{7,9}$/, // Finlande
  'PL': /^(\+48|0)[1-9]\d{8}$/, // Pologne
  'CZ': /^(\+420|0)[1-9]\d{8}$/, // République tchèque
  'HU': /^(\+36|0)[1-9]\d{7,8}$/, // Hongrie
  'RO': /^(\+40|0)[1-9]\d{8}$/, // Roumanie
  'BG': /^(\+359|0)[1-9]\d{7,8}$/, // Bulgarie
  'GR': /^(\+30|0)[1-9]\d{8,9}$/, // Grèce
  'PT': /^(\+351|0)[1-9]\d{8}$/, // Portugal
  
  // Afrique - Pays francophones
  'DZ': /^(\+213|0)[5-7]\d{8}$/, // Algérie
  'BJ': /^(\+229|0)\d{8}$/, // Bénin
  'BF': /^(\+226|0)[67]\d{7}$/, // Burkina Faso
  'BI': /^(\+257|0)\d{8}$/, // Burundi
  'CM': /^(\+237|0)[67]\d{8}$/, // Cameroun
  'CF': /^(\+236|0)\d{8}$/, // République centrafricaine
  'CG': /^(\+242|0)\d{8}$/, // Congo
  'CD': /^(\+243|0)\d{8}$/, // République démocratique du Congo
  'CI': /^(\+225|0)[67]\d{7}$/, // Côte d'Ivoire
  'DJ': /^(\+253|0)\d{8}$/, // Djibouti
  'GQ': /^(\+240|0)\d{8}$/, // Guinée équatoriale
  'GA': /^(\+241|0)[67]\d{7}$/, // Gabon
  'GN': /^(\+224|0)[67]\d{7}$/, // Guinée
  'GW': /^(\+245|0)\d{7}$/, // Guinée-Bissau
  'MG': /^(\+261|0)[32]\d{8}$/, // Madagascar
  'ML': /^(\+223|00223|0)[6789]\d{7}$/, // Mali - Format international: +223 ou 00223 + 8 chiffres
  'MR': /^(\+222|0)\d{8}$/, // Mauritanie
  'MA': /^(\+212|0)[67]\d{8}$/, // Maroc
  'NE': /^(\+227|0)[67]\d{7}$/, // Niger
  'SN': /^(\+221|0)[76]\d{7}$/, // Sénégal
  'TD': /^(\+235|0)\d{8}$/, // Tchad
  'TG': /^(\+228|0)[79]\d{7}$/, // Togo
  'TN': /^(\+216|0)[2-9]\d{7}$/, // Tunisie
  
  // Afrique - Autres pays
  'AO': /^(\+244|0)\d{9}$/, // Angola
  'BW': /^(\+267|0)[67]\d{7}$/, // Botswana
  'CV': /^(\+238|0)\d{7}$/, // Cap-Vert
  'KM': /^(\+269|0)\d{7}$/, // Comores
  'EG': /^(\+20|0)[1]\d{9}$/, // Égypte
  'ET': /^(\+251|0)\d{9}$/, // Éthiopie
  'GM': /^(\+220|0)\d{7}$/, // Gambie
  'GH': /^(\+233|0)[2-9]\d{8}$/, // Ghana
  'KE': /^(\+254|0)[17]\d{8}$/, // Kenya
  'LS': /^(\+266|0)\d{8}$/, // Lesotho
  'LR': /^(\+231|0)\d{8}$/, // Libéria
  'LY': /^(\+218|0)\d{9}$/, // Libye
  'MW': /^(\+265|0)\d{9}$/, // Malawi
  'MU': /^(\+230|0)\d{7}$/, // Maurice
  'MZ': /^(\+258|0)[2-8]\d{8}$/, // Mozambique
  'NA': /^(\+264|0)[67]\d{7}$/, // Namibie
  'NG': /^(\+234|0)[789]\d{9}$/, // Nigeria
  'RW': /^(\+250|0)\d{9}$/, // Rwanda
  'SC': /^(\+248|0)\d{7}$/, // Seychelles
  'SL': /^(\+232|0)[2-9]\d{7}$/, // Sierra Leone
  'ZA': /^(\+27|0)[678]\d{8}$/, // Afrique du Sud
  'SD': /^(\+249|0)\d{9}$/, // Soudan
  'TZ': /^(\+255|0)[67]\d{8}$/, // Tanzanie
  'UG': /^(\+256|0)[7]\d{8}$/, // Ouganda
  'ZM': /^(\+260|0)[9]\d{8}$/, // Zambie
  'ZW': /^(\+263|0)[7]\d{8}$/, // Zimbabwe
  
  // Amérique du Nord
  'US': /^(\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/, // États-Unis
  'CA': /^(\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/, // Canada
  'MX': /^(\+52|0)[1-9]\d{9}$/, // Mexique
  
  // Amérique du Sud
  'AR': /^(\+54|0)[9]\d{10}$/, // Argentine
  'BO': /^(\+591|0)[67]\d{7}$/, // Bolivie
  'BR': /^(\+55|0)[1-9]\d{10}$/, // Brésil
  'CL': /^(\+56|0)[9]\d{8}$/, // Chili
  'CO': /^(\+57|0)[3]\d{9}$/, // Colombie
  'EC': /^(\+593|0)[9]\d{8}$/, // Équateur
  'PE': /^(\+51|0)[9]\d{8}$/, // Pérou
  'UY': /^(\+598|0)[9]\d{7}$/, // Uruguay
  'VE': /^(\+58|0)[4]\d{9}$/, // Venezuela
  
  // Asie
  'CN': /^(\+86|0)[1][3-9]\d{9}$/, // Chine
  'IN': /^(\+91|0)[6-9]\d{9}$/, // Inde
  'JP': /^(\+81|0)[789]\d{9}$/, // Japon
  'KR': /^(\+82|0)[1]\d{8,9}$/, // Corée du Sud
  'TH': /^(\+66|0)[689]\d{8}$/, // Thaïlande
  'VN': /^(\+84|0)[3,5,7,8,9]\d{8}$/, // Viêt Nam
  'SG': /^(\+65|0)[689]\d{7}$/, // Singapour
  'MY': /^(\+60|0)[1][0-9]\d{7,8}$/, // Malaisie
  'ID': /^(\+62|0)[8]\d{9,10}$/, // Indonésie
  'PH': /^(\+63|0)[9]\d{9}$/, // Philippines
  
  // Moyen-Orient
  'SA': /^(\+966|0)[5]\d{8}$/, // Arabie saoudite
  'AE': /^(\+971|0)[5]\d{8}$/, // Émirats arabes unis
  'TR': /^(\+90|0)[5]\d{9}$/, // Turquie
  'IL': /^(\+972|0)[5]\d{8}$/, // Israël
  'IQ': /^(\+964|0)[7]\d{9}$/, // Irak
  'IR': /^(\+98|0)[9]\d{9}$/, // Iran
  
  // Océanie
  'AU': /^(\+61|0)[4]\d{8}$/, // Australie
  'NZ': /^(\+64|0)[2]\d{7,8}$/, // Nouvelle-Zélande
};

// Noms des pays
const countryNames: { [key: string]: string } = {
  'FR': 'France', 'DE': 'Allemagne', 'IT': 'Italie', 'ES': 'Espagne',
  'GB': 'Royaume-Uni', 'NL': 'Pays-Bas', 'BE': 'Belgique', 'CH': 'Suisse',
  'AT': 'Autriche', 'SE': 'Suède', 'NO': 'Norvège', 'DK': 'Danemark',
  'FI': 'Finlande', 'PL': 'Pologne', 'CZ': 'République tchèque', 'HU': 'Hongrie',
  'RO': 'Roumanie', 'BG': 'Bulgarie', 'GR': 'Grèce', 'PT': 'Portugal',
  'US': 'États-Unis', 'CA': 'Canada', 'MX': 'Mexique', 'BR': 'Brésil',
  'AR': 'Argentine', 'CL': 'Chili', 'CO': 'Colombie', 'PE': 'Pérou',
  'VE': 'Venezuela', 'ZA': 'Afrique du Sud', 'NG': 'Nigeria', 'EG': 'Égypte',
  'KE': 'Kenya', 'GH': 'Ghana', 'MA': 'Maroc', 'TN': 'Tunisie',
  'DZ': 'Algérie', 'SN': 'Sénégal', 'CI': 'Côte d\'Ivoire', 'BF': 'Burkina Faso',
  'ML': 'Mali', 'NE': 'Niger', 'TD': 'Tchad', 'CM': 'Cameroun',
  'CD': 'République démocratique du Congo', 'CN': 'Chine', 'JP': 'Japon',
  'KR': 'Corée du Sud', 'IN': 'Inde', 'TH': 'Thaïlande', 'VN': 'Viêt Nam',
  'ID': 'Indonésie', 'MY': 'Malaisie', 'SG': 'Singapour', 'PH': 'Philippines',
  'BD': 'Bangladesh', 'PK': 'Pakistan', 'LK': 'Sri Lanka', 'MM': 'Myanmar',
  'KH': 'Cambodge', 'LA': 'Laos', 'AE': 'Émirats arabes unis', 'SA': 'Arabie saoudite',
  'IL': 'Israël', 'TR': 'Turquie', 'IR': 'Iran', 'IQ': 'Irak',
  'AU': 'Australie', 'NZ': 'Nouvelle-Zélande'
};

// Fonction pour nettoyer le numéro de téléphone
const cleanPhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/[\s\-\(\)\.]/g, '');
};

// Fonction pour obtenir le nom du pays
export const getCountryName = (countryCode: string): string => {
  return countryNames[countryCode] || countryCode;
};

// Fonction pour valider un numéro de téléphone par pays
export const validatePhoneNumber = (
  phoneNumber: string, 
  countryCode: string
): { isValid: boolean; error?: string; formattedNumber?: string } => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return { isValid: true }; // Optionnel
  }

  const cleanNumber = cleanPhoneNumber(phoneNumber);
  const format = phoneFormats[countryCode];

  if (!format) {
    return {
      isValid: false,
      error: `Code pays non supporté: ${countryCode}`
    };
  }

  const testResult = format.test(cleanNumber);

  if (!testResult) {
    return {
      isValid: false,
      error: `Format invalide pour ${getCountryName(countryCode)}`
    };
  }

  return {
    isValid: true,
    formattedNumber: cleanNumber
  };
};

// Fonction pour formater un numéro de téléphone
export const formatPhoneNumber = (
  phoneNumber: string, 
  countryCode: string
): string => {
  const cleanNumber = cleanPhoneNumber(phoneNumber);
  
  // Formatage basique selon le pays
  switch (countryCode) {
    case 'FR':
      return cleanNumber.replace(/^(\+33|0)(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5 $6');
    case 'US':
    case 'CA':
      return cleanNumber.replace(/^(\+1|1)?(\d{3})(\d{3})(\d{4})$/, '+1 ($2) $3-$4');
    case 'GB':
      return cleanNumber.replace(/^(\+44|0)(\d{2,3})(\d{3,4})(\d{3,4})$/, '$1 $2 $3 $4');
    default:
      return cleanNumber;
  }
};

// Fonction pour détecter automatiquement le pays à partir du numéro
export const detectCountryFromPhone = (phoneNumber: string): string | null => {
  const cleanNumber = cleanPhoneNumber(phoneNumber);
  
  // Vérifier les indicatifs internationaux
  for (const [countryCode, format] of Object.entries(phoneFormats)) {
    if (format.test(cleanNumber)) {
      return countryCode;
    }
  }
  
  return null;
};

// Liste des codes pays supportés
export const getSupportedCountries = (): string[] => {
  return Object.keys(countryNames);
};

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

  // Vérifier la complexité du mot de passe
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      isValid: false,
      error: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    };
  }

  return { isValid: true };
};
