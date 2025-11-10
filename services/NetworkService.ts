// Version simplifiée pour Expo Go (sans NetInfo natif)
// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { store } from '../store';
import { setConnectionStatus } from '../store/slices/networkSlice';

class NetworkService {
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  // Initialiser le service réseau (version simplifiée pour Expo Go)
  async init() {
    if (this.isInitialized) return;

    try {
      // Simuler l'état initial (connecté par défaut)
      this.handleNetworkChange({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });

      this.isInitialized = true;
      console.log('🌐 Service réseau initialisé (mode Expo Go)');
    } catch (error) {
      console.error('❌ Erreur initialisation service réseau:', error);
    }
  }

  // Gérer les changements de connectivité
  private handleNetworkChange(state: any) {
    const { isConnected, type, isInternetReachable } = state;

    // Mettre à jour le store Redux
    store.dispatch(setConnectionStatus({
      isConnected: isConnected || false,
      connectionType: type,
      isInternetReachable,
    }));

    // Logs pour le debug
    console.log('🌐 État réseau:', {
      isConnected,
      type,
      isInternetReachable,
      timestamp: new Date().toISOString(),
    });

    // Notifier les autres services du changement
    this.notifyNetworkChange(isConnected || false, type);
  }

  // Notifier les autres services du changement de réseau
  private notifyNetworkChange(isConnected: boolean, connectionType: string | null) {
    // Pour React Native, on utilise directement le store Redux
    // au lieu des événements DOM
    console.log('🌐 Changement de réseau notifié:', { isConnected, connectionType });
  }

  // Obtenir l'état actuel du réseau (version simplifiée)
  async getCurrentState(): Promise<any> {
    return {
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
    };
  }

  // Vérifier si l'appareil est connecté à Internet (version simplifiée)
  async isConnected(): Promise<boolean> {
    try {
      // Essayer une requête simple pour vérifier la connectivité
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        timeout: 3000 
      });
      return response.ok;
    } catch (error) {
      console.warn('🌐 Pas de connexion Internet détectée');
      return false;
    }
  }

  // Vérifier si l'Internet est accessible (version simplifiée)
  async isInternetReachable(): Promise<boolean> {
    return true; // Toujours accessible en mode Expo Go
  }

  // Obtenir le type de connexion (version simplifiée)
  async getConnectionType(): Promise<string | null> {
    return 'wifi'; // Simuler WiFi en mode Expo Go
  }

  // Attendre qu'une connexion soit disponible (version simplifiée)
  async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      // En mode Expo Go, toujours connecté
      setTimeout(() => resolve(true), 100);
    });
  }

  // Nettoyer les ressources
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
    console.log('🌐 Service réseau détruit');
  }
}

// Instance singleton
export const networkService = new NetworkService();

// Types pour les événements réseau
export interface NetworkChangeEvent {
  isConnected: boolean;
  connectionType: string | null;
  timestamp: string;
}

// Hook pour utiliser le service réseau dans les composants
export const useNetworkStatus = () => {
  const networkState = store.getState().network;
  
  return {
    isConnected: networkState.isConnected,
    connectionType: networkState.connectionType,
    isInternetReachable: networkState.isInternetReachable,
    lastConnected: networkState.lastConnected,
    lastDisconnected: networkState.lastDisconnected,
  };
};
