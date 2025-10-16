/**
 * Utilitaires réseau pour la détection automatique d'IP
 */


/**
 * Détecte l'IP réseau de la machine (simulation pour React Native)
 * En réalité, on utilise l'IP configurée dans le script
 */
export const getCurrentNetworkIP = (): string => {
  // En React Native, on ne peut pas directement obtenir l'IP
  // On utilise donc l'IP détectée par le script
  return '192.168.8.68'; // Sera mise à jour par le script fix-network.js
};

/**
 * Génère les URLs de fallback avec l'IP actuelle en priorité
 */
export const generateFallbackURLs = (): string[] => {
  const currentIP = getCurrentNetworkIP();
  const urls: string[] = [];
  
  // 1. IP actuelle (priorité absolue)
  urls.push(`http://${currentIP}:3000`);
  
  // 2. Localhost
  urls.push('http://localhost:3000');
  
  // 3. Plages communes
  const commonRanges = [
    '192.168.8',   // Réseau actuel
    '192.168.1',   // Routeur classique
    '192.168.0',   // Routeur classique
    '10.0.0',      // Réseau d'entreprise
    '172.16.0',    // Réseau d'entreprise
  ];
  
  commonRanges.forEach(range => {
    for (let i = 1; i <= 20; i++) {
      const url = `http://${range}.${i}:3000`;
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  });
  
  return urls;
};

/**
 * Teste la connectivité vers une URL
 */
export const testConnectivity = async (url: string, timeout: number = 5000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Trouve la première URL qui fonctionne
 */
export const findWorkingURL = async (urls: string[]): Promise<string | null> => {
  for (const url of urls) {
    console.log(`🔍 Test de connectivité vers: ${url}`);
    
    const isWorking = await testConnectivity(url);
    
    if (isWorking) {
      console.log(`✅ Connexion réussie vers: ${url}`);
      return url;
    } else {
      console.log(`❌ Échec de connexion vers: ${url}`);
    }
  }
  
  return null;
};

/**
 * Obtient l'URL de base qui fonctionne
 */
export const getWorkingBaseURL = async (): Promise<string> => {
  const fallbackURLs = generateFallbackURLs();
  const workingURL = await findWorkingURL(fallbackURLs);
  
  if (workingURL) {
    return workingURL;
  }
  
  // Fallback vers l'IP actuelle si rien ne fonctionne
  return `http://${getCurrentNetworkIP()}:3000`;
};
