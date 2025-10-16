import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
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
      const allLocations = await databaseService.getAll('locations') as any[];
      const inventory = await databaseService.getAll('inventory') as any[];
      const products = await databaseService.getAll('products') as any[];
      
      const locationsWithStats = allLocations.map(location => {
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
      
      const locationData = {
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        location_type: newLocation.location_type,
        contact_person: newLocation.contact_person.trim() || undefined,
        phone: newLocation.phone.trim() || undefined,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };
      
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
        } catch (error) {
          const localId = await databaseService.insert('locations', locationData);
          await syncService.addToSyncQueue('locations', localId, 'create', locationData);
        }
      } else {
        const localId = await databaseService.insert('locations', locationData);
        await syncService.addToSyncQueue('locations', localId, 'create', locationData);
      }
      
      await loadLocations();
      setNewLocation({ name: '', address: '', location_type: 'warehouse', contact_person: '', phone: '' });
      setShowCreateModal(false);
      Alert.alert('Succès', 'Emplacement créé ! 🏢');
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

              if (isConnected) {
                try {
                  // Supprimer de Firebase d'abord
                  if (location.firebase_id) {
                    await firebaseService.deleteLocation(location.firebase_id);
                  }
                  
                  // Supprimer localement
                  await databaseService.delete('locations', location.id);
                  databaseService.invalidateCache('locations');
                } catch (error) {
                  // Si Firebase échoue, supprimer localement et ajouter à la queue
                  await databaseService.delete('locations', location.id);
                  databaseService.invalidateCache('locations');
                  await syncService.addToSyncQueue('locations', location.id, 'delete', { firebase_id: location.firebase_id });
                }
              } else {
                // Mode offline : supprimer localement et ajouter à la queue
                await databaseService.delete('locations', location.id);
                databaseService.invalidateCache('locations');
                await syncService.addToSyncQueue('locations', location.id, 'delete', { firebase_id: location.firebase_id });
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
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 Nouvel Emplacement</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Entrepôt Central"
                  value={newLocation.name}
                  onChangeText={(text) => setNewLocation({ ...newLocation, name: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adresse *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: 123 Rue..., Bamako"
                  value={newLocation.address}
                  onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
                  multiline
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
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={handleCreateLocation} disabled={loading}>
                <Text style={styles.modalButtonText}>{loading ? 'Création...' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: dynamicSizes.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: { fontSize: isTablet ? 24 : 20, fontWeight: 'bold', color: '#1a1a1a' },
  modalBody: { padding: dynamicSizes.spacing.lg },
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
  modalFooter: {
    flexDirection: 'row',
    padding: dynamicSizes.spacing.lg,
    gap: dynamicSizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: { flex: 1, paddingVertical: dynamicSizes.spacing.md, borderRadius: 12, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#f0f0f0' },
  modalButtonConfirm: { backgroundColor: '#007AFF' },
  modalButtonText: { color: '#fff', fontSize: dynamicSizes.fontSize.medium, fontWeight: '600' },
  modalButtonTextCancel: { color: '#1a1a1a', fontSize: dynamicSizes.fontSize.medium, fontWeight: '600' },
  deleteButton: {
    padding: dynamicSizes.spacing.md,
    marginRight: dynamicSizes.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

