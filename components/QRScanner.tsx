import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Import conditionnel pour éviter l'erreur en mode Expo Go
let CameraView: any = null;
let useCameraPermissions: any = null;
let isCameraAvailable = false;

try {
  const cameraModule = require('expo-camera');
  if (cameraModule.CameraView) {
    CameraView = cameraModule.CameraView;
  }
  if (cameraModule.useCameraPermissions) {
    useCameraPermissions = cameraModule.useCameraPermissions;
  }
  isCameraAvailable = true;
  console.log('✅ Module expo-camera chargé avec succès');
} catch (error) {
  console.log('📱 Modules natifs non disponibles:', error);
  isCameraAvailable = false;
}

const { width, height } = Dimensions.get('window');

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

// Hook personnalisé pour gérer les permissions de manière sécurisée
const useSafeCameraPermissions = () => {
  // Utiliser le hook réel si disponible, sinon état local
  const [realPermission, realRequestPermission] = useCameraPermissions 
    ? useCameraPermissions() 
    : [null, null];
  
  const [localPermission, setLocalPermission] = useState<any>(null);
  
  // Synchroniser avec le hook réel
  useEffect(() => {
    if (realPermission !== undefined) {
      setLocalPermission(realPermission);
    }
  }, [realPermission]);
  
  const requestPermission = useCallback(async () => {
    if (realRequestPermission) {
      const result = await realRequestPermission();
      setLocalPermission(result);
      return result;
    }
    return null;
  }, [realRequestPermission]);
  
  return [localPermission || realPermission, requestPermission];
};

// Composant interne qui utilise le hook
const QRScannerContent: React.FC<QRScannerProps & { isCameraAvailable: boolean }> = ({
  onScan,
  onClose,
  title,
  subtitle,
  isCameraAvailable
}) => {
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Ref pour éviter les scans multiples rapides
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Utiliser le hook sécurisé
  const [permission, requestPermission] = useSafeCameraPermissions();
  
  const hasPermission = isCameraAvailable && permission ? (permission.granted || false) : false;
  const isLoading = isCameraAvailable ? (permission === null) : false;

  // Demander la permission si nécessaire
  useEffect(() => {
    if (!isCameraAvailable) {
      console.log('📱 Mode Expo Go - Scanner simulé (expo-camera non installé)');
      return;
    }
    
    if (!requestPermission) {
      console.warn('⚠️ requestPermission non disponible');
      return;
    }
    
    if (permission === null && requestPermission) {
      console.log('📷 Demande de permission caméra...');
      requestPermission().catch((err: any) => {
        console.error('❌ Erreur demande permission:', err);
        setError('Erreur lors de la demande de permission caméra');
      });
    } else if (permission?.granted) {
      console.log('✅ Permission caméra accordée');
      setError(null);
    } else if (permission && !permission.granted) {
      console.log('❌ Permission caméra refusée:', permission.status);
      setError('Permission caméra refusée. Veuillez l\'activer dans les paramètres.');
    }
  }, [permission, requestPermission, isCameraAvailable]);
  
  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Gestion optimisée du scan avec debounce
  const handleBarCodeScanned = useCallback(({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    // Debounce pour éviter les scans multiples rapides
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    scanTimeoutRef.current = setTimeout(() => {
      setScanned(true);
      console.log('🔍 Code scanné:', { type, data });
      
      // Validation des données
      if (!data || data.trim().length === 0) {
        console.warn('⚠️ Données de scan vides');
        setScanned(false);
        return;
      }
      
      // Feedback haptique (si disponible)
      try {
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics non disponible, ignorer silencieusement
      }
      
      // Envoyer les données au parent
      onScan(data);
    }, 100); // Debounce de 100ms
  }, [scanned, onScan]);

  // Toggle flash avec gestion d'erreur
  const toggleFlash = useCallback(() => {
    try {
      setFlashOn(prev => {
        const newState = !prev;
        console.log('⚡ Flash:', newState ? 'ON' : 'OFF');
        return newState;
      });
    } catch (error) {
      console.warn('⚠️ Erreur toggle flash:', error);
    }
  }, []);

  // Reset scanner avec cleanup
  const resetScanner = useCallback(() => {
    try {
      setScanned(false);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      console.log('🔄 Scanner réinitialisé');
    } catch (error) {
      console.warn('⚠️ Erreur reset scanner:', error);
    }
  }, []);

  // Retry permissions
  const retryPermissions = useCallback(() => {
    setError(null);
    if (requestPermission) {
      requestPermission();
    }
  }, [requestPermission]);

  // Saisie manuelle pour mode Expo Go
  const handleManualScan = useCallback(() => {
    if (!manualInput.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code ou des données');
      return;
    }
    
    console.log('🔍 Saisie manuelle:', manualInput);
    onScan(manualInput);
    setManualInput('');
    setShowManualInput(false);
  }, [manualInput, onScan]);

  // État de chargement
  if (isLoading || hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Initialisation...</Text>
          <Text style={styles.permissionText}>
            Demande d'autorisation caméra en cours...
          </Text>
        </View>
      </View>
    );
  }

  // État d'erreur ou permission refusée
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#FF3B30" />
          <Text style={styles.permissionTitle}>Accès caméra refusé</Text>
          <Text style={styles.permissionText}>
            {error || 'L\'accès à la caméra est nécessaire pour scanner les codes QR.'}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={retryPermissions}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
              <Text style={styles.permissionButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
          <Ionicons 
            name={flashOn ? "flash" : "flash-off"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {/* Scanner QR Code */}
      <View style={styles.scannerContainer}>
        {CameraView && hasPermission && isCameraAvailable ? (
          // Vrai scanner avec caméra (mode natif)
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'code128',
                'code39',
                'upc_a',
                'upc_e',
                'datamatrix',
                'pdf417',
              ],
            }}
            enableTorch={flashOn}
          >
            {/* Overlay avec cadre de visée */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                {/* Coins du cadre de visée */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              
              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Pointez la caméra vers le code QR ou code-barres
                </Text>
              </View>
            </View>
          </CameraView>
        ) : (
          // Mode Expo Go - Interface de test
          <View style={styles.expoGoContainer}>
            <Ionicons name="camera-outline" size={64} color="#007AFF" />
            <Text style={styles.expoGoTitle}>Scanner QR Code</Text>
            <Text style={styles.expoGoText}>
              Mode Expo Go - Scanner simulé
            </Text>
            <Text style={styles.expoGoSubtext}>
              Utilisez la saisie manuelle pour tester
            </Text>
            
            {!showManualInput ? (
              <TouchableOpacity 
                style={styles.manualButton}
                onPress={() => setShowManualInput(true)}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.manualButtonText}>Saisie Manuelle</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.manualInputContainer}>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Saisissez un code-barres ou QR code..."
                  value={manualInput}
                  onChangeText={setManualInput}
                  multiline
                  autoFocus
                />
                <View style={styles.manualButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowManualInput(false);
                      setManualInput('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.scanButton}
                    onPress={handleManualScan}
                  >
                    <Text style={styles.scanButtonText}>Scanner</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionsContainer}>
        {scanned && (
          <TouchableOpacity style={styles.rescanButton} onPress={resetScanner}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.rescanButtonText}>Scanner à nouveau</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Composant principal avec vérification de disponibilité
export const QRScanner: React.FC<QRScannerProps> = (props) => {
  return <QRScannerContent {...props} isCameraAvailable={isCameraAvailable} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: -80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionsContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  expoGoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  expoGoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  expoGoText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  expoGoSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  manualButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualInputContainer: {
    width: '100%',
    marginTop: 20,
  },
  manualInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  manualButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
