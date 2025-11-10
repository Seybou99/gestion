import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';
import { syncService } from '../services/SyncService';
import { RootState } from '../store';
import EntrepotDetails from './EntrepotDetails';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const dynamicSizes = {
  spacing: {
    xs: isTablet ? 6 : 4,
    sm: isTablet ? 12 : 8,
    md: isTablet ? 20 : 16,
    lg: isTablet ? 28 : 20,
    xl: isTablet ? 32 : 24,
  },
  fontSize: {
    small: isTablet ? 16 : 12,
    medium: isTablet ? 18 : 14,
    large: isTablet ? 22 : 16,
    xlarge: isTablet ? 28 : 20,
  },
  button: {
    size: isTablet ? 64 : 48,
  }
};

export default function EntrepotsTab() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isConnected } = useSelector((state: RootState) => state.network);
  
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    location_type: 'warehouse' as 'warehouse' | 'store' | 'supplier',
    contact_person: '',
    phone: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'utilisateur actuel
      const { getCurrentUser } = await import('../utils/userInfo');
      const user = await getCurrentUser();
      
      if (!user) {
        console.warn('⚠️ Utilisateur non connecté');
        setLoading(false);
        return;
      }
      
      const allLocations = await databaseService.getAll('locations') as any[];
      
      // Filtrer uniquement les emplacements créés par l'utilisateur actuel
      const userLocations = allLocations.filter(location => location.created_by === user.uid);
      
      const inventory = await databaseService.getAll('inventory') as any[];
      const products = await databaseService.getAll('products') as any[];
      
      const locationsWithStats = userLocations.map(location => {
        const locationInventory = inventory.filter(inv => inv.location_id === location.id);
        const productsCount = locationInventory.length;
        const lowStockCount = locationInventory.filter(inv => inv.quantity_available < inv.quantity_min).length;
        const totalValue = locationInventory.reduce((sum, inv) => {
          const product = products.find(p => p.id === inv.product_id);
          return sum + (inv.quantity_available * (product?.price_sell || 0));
        }, 0);
        
        return {
          ...location,
          products_count: productsCount,
          total_value: totalValue,
          low_stock_count: lowStockCount,
        };
      });
      
      setLocations(locationsWithStats);
    } catch (error) {
      console.error('Erreur chargement emplacements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    try {
      if (!newLocation.name.trim() || !newLocation.address.trim()) {
        Alert.alert('Erreur', 'Le nom et l\'adresse sont requis');
        return;
      }
      
      setLoading(true);
      
      // Récupérer les informations de l'utilisateur actuel
      const { getCurrentUser } = await import('../utils/userInfo');
      const user = await getCurrentUser();
      
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setLoading(false);
        return;
      }
      
      // Créer l'objet de données en omettant les champs undefined (Firebase ne supporte pas undefined)
      const locationData: any = {
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        location_type: newLocation.location_type,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
        created_by: user.uid,
        created_by_name: user.email || user.displayName || 'Utilisateur',
      };
      
      // Ajouter uniquement les champs non vides
      if (newLocation.contact_person.trim()) {
        locationData.contact_person = newLocation.contact_person.trim();
      }
      if (newLocation.phone.trim()) {
        locationData.phone = newLocation.phone.trim();
      }
      
      let newLocationId: string;
      
      if (isConnected) {
        try {
          const firebaseId = await firebaseService.createLocation(locationData);
          
          const locationWithFirebaseId = {
            ...locationData,
            id: firebaseId,
            firebase_id: firebaseId,
            sync_status: 'synced' as const,
          };
          
          const existing = await AsyncStorage.getItem('locations');
          const items = existing ? JSON.parse(existing) : [];
          items.push(locationWithFirebaseId);
          await AsyncStorage.setItem('locations', JSON.stringify(items));
          databaseService.invalidateCache('locations');
          
          newLocationId = firebaseId;
        } catch (error) {
          console.error('❌ Erreur création Firebase:', error);
          const localId = await databaseService.insert('locations', locationData);
          await syncService.addToSyncQueue('locations', localId, 'create', locationData);
          databaseService.invalidateCache('locations');
          
          newLocationId = localId;
        }
      } else {
        const localId = await databaseService.insert('locations', locationData);
        await syncService.addToSyncQueue('locations', localId, 'create', locationData);
        databaseService.invalidateCache('locations');
        
        newLocationId = localId;
      }
      
      // Attendre que la synchronisation soit terminée
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recharger les emplacements
      await loadLocations();
      
      // Nettoyer le formulaire
      setNewLocation({ name: '', address: '', location_type: 'warehouse', contact_person: '', phone: '' });
      Keyboard.dismiss();
      setShowCreateModal(false);
      
      // Trouver l'ID final de l'emplacement (peut avoir changé après synchronisation)
      const updatedLocations = await databaseService.getAll('locations') as any[];
      const finalLocation = updatedLocations.find(loc => 
        loc.id === newLocationId || loc.name === locationData.name
      );
      
      const finalLocationId = finalLocation?.id || newLocationId;
      
      Alert.alert('Succès', 'Emplacement créé ! 🏢', [
        {
          text: 'Voir les détails',
          onPress: () => {
            setSelectedLocationId(finalLocationId);
            setShowDetailsModal(true);
          }
        },
        { text: 'OK' }
      ]);
    } catch (error) {
      console.error('Erreur création:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'emplacement');
    } finally {
      setLoading(false);
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'warehouse': return 'Entrepôt';
      case 'store': return 'Magasin';
      case 'supplier': return 'Fournisseur';
      default: return type;
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'warehouse': return 'business-outline';
      case 'store': return 'storefront-outline';
      case 'supplier': return 'cube-outline';
      default: return 'location-outline';
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'warehouse': return '#007AFF';
      case 'store': return '#34C759';
      case 'supplier': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const handleOpenDetails = (locationId: string) => {
    setSelectedLocationId(locationId);
    setShowDetailsModal(true);
  };

  const handleDeleteLocation = async (location: any) => {
    // Vérifier s'il y a des produits dans cet entrepôt
    if (location.products_count > 0) {
      Alert.alert(
        'Impossible de supprimer',
        `Cet entrepôt contient ${location.products_count} produit(s). Veuillez d'abord supprimer ou transférer tous les produits.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'entrepôt "${location.name}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Récupérer la location complète depuis la BDD pour avoir firebase_id
              const locationData = await databaseService.getById('locations', location.id) as any;
              
              if (!locationData) {
                Alert.alert('Erreur', 'Emplacement introuvable dans la base de données');
                return;
              }

              // Déterminer l'ID Firebase à utiliser pour la suppression
              let firebaseIdToDelete = locationData?.firebase_id;
              
              // Si pas de firebase_id mais sync_status est 'synced', 
              // chercher dans Firebase par nom pour trouver le vrai ID
              if (!firebaseIdToDelete && locationData?.sync_status === 'synced' && isConnected) {
                try {
                  const firebaseLocations = await firebaseService.getLocations();
                  const matchingLocation = firebaseLocations.find(
                    (loc: any) => loc.name === locationData.name && 
                                 loc.address === locationData.address &&
                                 loc.created_by === locationData.created_by
                  );
                  
                  if (matchingLocation) {
                    firebaseIdToDelete = matchingLocation.id;
                  } else {
                    // Essayer avec l'ID local comme dernier recours
                    firebaseIdToDelete = locationData.id;
                  }
                } catch (error) {
                  // En cas d'erreur, essayer avec l'ID local
                  firebaseIdToDelete = locationData.id;
                }
              } else if (!firebaseIdToDelete && locationData?.sync_status === 'synced') {
                // Mode offline ou pas de connexion : utiliser l'ID local
                firebaseIdToDelete = locationData.id;
              }

              if (isConnected) {
                try {
                  let firebaseDeleted = false;
                  
                  // Liste des IDs à essayer pour la suppression Firebase (dans l'ordre)
                  const idsToTry = [
                    firebaseIdToDelete,  // ID trouvé (firebase_id ou recherché)
                    locationData?.id,    // ID local (au cas où ils sont identiques)
                  ].filter(Boolean); // Retirer les valeurs null/undefined
                  
                  // Essayer de supprimer avec chaque ID jusqu'à ce qu'un fonctionne
                  for (const idToTry of idsToTry) {
                    if (firebaseDeleted) break; // Déjà supprimé, arrêter
                    
                    try {
                      await firebaseService.deleteLocation(idToTry);
                      firebaseDeleted = true;
                      break; // Succès, arrêter
                    } catch (firebaseError: any) {
                      // Si l'erreur est que le document n'existe pas, c'est OK (déjà supprimé)
                      if (firebaseError?.message?.includes('not found') || 
                          firebaseError?.code === 'not-found' ||
                          firebaseError?.message?.includes('No document')) {
                        firebaseDeleted = true; // Considérer comme supprimé (peut-être avec un autre ID)
                        break;
                      }
                      // Continuer avec le prochain ID
                    }
                  }
                } catch (error: any) {
                  // Erreur silencieuse, on continue avec la suppression locale
                }
              }
              
              // Supprimer de la BDD locale (AsyncStorage) dans tous les cas (même si Firebase a échoué)
              try {
                await databaseService.delete('locations', location.id);
                
                // Invalider le cache explicitement
                databaseService.invalidateCache('locations');
                
                // Si Firebase n'a pas été supprimé mais qu'on a un ID, ajouter à la queue
                if (isConnected && firebaseIdToDelete) {
                  // Vérifier si Firebase a été supprimé en essayant de le récupérer
                  try {
                    const firebaseLocation = await firebaseService.getLocationById(firebaseIdToDelete);
                    if (firebaseLocation) {
                      await syncService.addToSyncQueue('locations', location.id, 'delete', { 
                        firebase_id: firebaseIdToDelete 
                      });
                    }
                  } catch (checkError) {
                    // Si erreur lors de la vérification, ajouter à la queue par précaution
                    await syncService.addToSyncQueue('locations', location.id, 'delete', { 
                      firebase_id: firebaseIdToDelete 
                    });
                  }
                } else if (!isConnected && firebaseIdToDelete) {
                  // Mode offline : ajouter à la queue
                  await syncService.addToSyncQueue('locations', location.id, 'delete', { 
                    firebase_id: firebaseIdToDelete 
                  });
                }
              } catch (localError: any) {
                console.error('Erreur lors de la suppression locale:', localError);
                throw localError; // Relancer l'erreur pour qu'elle soit gérée par le catch principal
              }

              await loadLocations();
              Alert.alert('Succès', 'Entrepôt supprimé ! 🗑️');
            } catch (error) {
              console.error('Erreur suppression entrepôt:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'entrepôt');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderLocation = ({ item }: { item: any }) => (
    <View style={styles.locationCard}>
      <TouchableOpacity
        style={styles.locationContent}
        onPress={() => handleOpenDetails(item.id)}
      >
        <View style={styles.locationHeader}>
          <View style={[styles.locationIcon, { backgroundColor: `${getLocationTypeColor(item.location_type)}20` }]}>
            <Ionicons name={getLocationTypeIcon(item.location_type) as any} size={28} color={getLocationTypeColor(item.location_type)} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{item.name}</Text>
            <Text style={styles.locationType}>{getLocationTypeLabel(item.location_type)}</Text>
          </View>
        </View>
        <View style={styles.locationAddress}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
        <View style={styles.locationStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.products_count}</Text>
            <Text style={styles.statLabel}>Produits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(item.total_value || 0).toLocaleString('fr-FR')}</Text>
            <Text style={styles.statLabel}>Valeur</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, item.low_stock_count > 0 && { color: '#FF3B30' }]}>
              {item.low_stock_count}
            </Text>
            <Text style={styles.statLabel}>Alertes</Text>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Bouton de suppression */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteLocation(item)}
        disabled={loading}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={locations}
        renderItem={renderLocation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun emplacement</Text>
            <Text style={styles.emptySubtext}>Créez votre premier entrepôt</Text>
          </View>
        }
      />

      {/* Bouton d'action flottant - Position corrigée */}
      <TouchableOpacity 
        style={[
          styles.fab,
          { bottom: 50 + insets.bottom }
        ]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={dynamicSizes.fontSize.xlarge} color="#fff" />
      </TouchableOpacity>

      {/* Modale Création */}
      <Modal 
        visible={showCreateModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setShowCreateModal(false);
              }}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouvel Emplacements</Text>
            <TouchableOpacity
              onPress={handleCreateLocation}
              style={styles.modalSaveButton}
              disabled={loading}
            >
              <Text style={styles.modalSaveText}>
                {loading ? 'Création...' : 'Créer'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Entrepôt Central"
                  value={newLocation.name}
                  onChangeText={(text) => setNewLocation({ ...newLocation, name: text })}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adresse *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: 123 Rue..., Bamako"
                  value={newLocation.address}
                  onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type *</Text>
                <View style={styles.typeSelector}>
                  {['warehouse', 'store', 'supplier'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeButton, newLocation.location_type === type && styles.typeButtonActive]}
                      onPress={() => setNewLocation({ ...newLocation, location_type: type as any })}
                    >
                      <Text style={[styles.typeButtonText, newLocation.location_type === type && styles.typeButtonTextActive]}>
                        {getLocationTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Contact (Optionnel) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Personne de contact (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jean Dupont"
                  value={newLocation.contact_person}
                  onChangeText={(text) => setNewLocation({ ...newLocation, contact_person: text })}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Téléphone (Optionnel) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Téléphone (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: +223 XX XX XX XX"
                  value={newLocation.phone}
                  onChangeText={(text) => setNewLocation({ ...newLocation, phone: text })}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Détails Entrepôt */}
      <Modal visible={showDetailsModal} animationType="slide" presentationStyle="fullScreen">
        {selectedLocationId && (
          <EntrepotDetails
            locationId={selectedLocationId}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedLocationId(null);
              loadLocations(); // Recharger après fermeture
            }}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  list: { padding: dynamicSizes.spacing.lg, paddingBottom: 100 },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: dynamicSizes.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContent: {
    flex: 1,
    padding: dynamicSizes.spacing.lg,
  },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: dynamicSizes.spacing.md },
  locationIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: dynamicSizes.spacing.md,
  },
  locationInfo: { flex: 1 },
  locationName: { fontSize: dynamicSizes.fontSize.large, fontWeight: '600', color: '#1a1a1a' },
  locationType: { fontSize: dynamicSizes.fontSize.small, color: '#666' },
  locationAddress: { flexDirection: 'row', alignItems: 'center', marginBottom: dynamicSizes.spacing.md, gap: dynamicSizes.spacing.xs },
  addressText: { fontSize: dynamicSizes.fontSize.small, color: '#666', flex: 1 },
  locationStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: dynamicSizes.spacing.md, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: dynamicSizes.fontSize.large, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: dynamicSizes.fontSize.small, color: '#999' },
  statDivider: { width: 1, backgroundColor: '#f0f0f0' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: dynamicSizes.fontSize.large, color: '#999', marginTop: dynamicSizes.spacing.md },
  emptySubtext: { fontSize: dynamicSizes.fontSize.medium, color: '#ccc', marginTop: dynamicSizes.spacing.xs },
  fab: {
    position: 'absolute',
    right: dynamicSizes.spacing.xl,
    width: dynamicSizes.button.size + 8,
    height: dynamicSizes.button.size + 8,
    borderRadius: (dynamicSizes.button.size + 8) / 2,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: { 
    fontSize: isTablet ? 24 : 20, 
    fontWeight: '600', 
    color: '#1a1a1a' 
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Espace supplémentaire pour le clavier
  },
  inputGroup: { marginBottom: dynamicSizes.spacing.lg },
  inputLabel: { fontSize: dynamicSizes.fontSize.medium, fontWeight: '600', color: '#1a1a1a', marginBottom: dynamicSizes.spacing.sm },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', gap: dynamicSizes.spacing.sm },
  typeButton: {
    flex: 1,
    padding: dynamicSizes.spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  typeButtonText: { fontSize: dynamicSizes.fontSize.small, fontWeight: '600', color: '#1a1a1a' },
  typeButtonTextActive: { color: '#fff' },
  deleteButton: {
    padding: dynamicSizes.spacing.md,
    marginRight: dynamicSizes.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

