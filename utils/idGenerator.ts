// Générateur d'ID simple sans dépendances externes
// Compatible avec React Native, Expo Go et Web

// Fonction pour générer des IDs uniques
export const generateId = (): string => {
  // Utiliser timestamp + random pour garantir l'unicité
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `id-${timestamp}-${randomPart}`;
};

// Alternative avec plus de caractères aléatoires
export const generateLongId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart1}-${randomPart2}`;
};

// Fonction pour générer des UUID-like (format similaire à UUID)
export const generateUUID = (): string => {
  const timestamp = Date.now().toString(16);
  const random1 = Math.random().toString(16).substring(2, 10);
  const random2 = Math.random().toString(16).substring(2, 10);
  const random3 = Math.random().toString(16).substring(2, 10);
  const random4 = Math.random().toString(16).substring(2, 14);
  
  return `${random1}-${random2}-${random3}-${random4}`;
};