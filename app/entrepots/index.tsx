import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { ClearDataButton } from '../../components/ClearDataButton';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { syncService } from '../../services/SyncService';
import { RootState } from '../../store';
import { getCurrentUser } from '../../utils/userInfo';

const { width, height } = Dimensions.get('window');

// Breakpoints responsive
const isTablet = width > 768;
const isDesktop = width > 1024;

// Tailles dynamiques
const dynamicSizes = {
  spacing: {
    xs: isTablet ? 6 : 4,
    sm: isTablet ? 12 : 8,
    md: isTablet ? 20 : 16,
    lg: isTablet ? 28 : 20,
  },
  fontSize: {
    small: isTablet ? 16 : 12,
    medium: isTablet ? 18 : 14,
    large: isTablet ? 22 : 16,
  },
  button: {
    size: isTablet ? 48 : 40,
  },
};

interface LocationItem {
  id: string;
  name: string;
  address: string;
  location_type: 'warehouse' | 'store' | 'supplier';
  contact_person?: string;
  phone?: string;
  is_active: boolean;
  products_count: number;
  total_value: number;
  low_stock_count: number;
  sync_status: 'synced' | 'pending' | 'error';
}

export default function EntrepotsScreen() {
  const router = useRouter();
  const { isConnected } = useSelector((state: RootState) => state.network);
  
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  
  // Formulaire de création
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
      
      // Charger les emplacements
      const allLocations = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour locations');
          return [];
        }
        return await databaseService.getAllByUser('locations', user.uid);
      })() as any[];
      
      // Charger l'inventaire pour calculer les stats
      const inventory = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour inventory');
          return [];
        }
        return await databaseService.getAllByUser('inventory', user.uid);
      })() as any[];
      const products = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour products');
          return [];
        }
        return await databaseService.getAllByUser('products', user.uid);
      })() as any[];
      
      // Calculer les statistiques pour chaque emplacement
      const locationsWithStats: LocationItem[] = allLocations.map(location => {
        const locationInventory = inventory.filter(inv => inv.location_id === location.id);
        
        const productsCount = locationInventory.length;
        const lowStockCount = locationInventory.filter(inv => 
          inv.quantity_available < inv.quantity_min
        ).length;
        
        const totalValue = locationInventory.reduce((sum, inv) => {
          const product = products.find(p => p.id === inv.product_id);
          return sum + (inv.quantity_available * (product?.price_sell || 0));
        }, 0);
        
        return {
          id: location.id,
          name: location.name,
          address: location.address,
          location_type: location.location_type,
          contact_person: location.contact_person,
          phone: location.phone,
          is_active: location.is_active,
          products_count: productsCount,
          total_value: totalValue,
          low_stock_count: lowStockCount,
          sync_status: location.sync_status || 'synced',
        };
      });
      
      setLocations(locationsWithStats);
      console.log(`🏢 ${locationsWithStats.length} emplacements chargés`);
    } catch (error) {
      console.error('Erreur chargement emplacements:', error);
      Alert.alert('Erreur', 'Impossible de charger les emplacements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    try {
      // Validation
      if (!newLocation.name.trim()) {
        Alert.alert('Erreur', 'Le nom de l\'emplacement est requis');
        return;
      }
      
      if (!newLocation.address.trim()) {
        Alert.alert('Erreur', 'L\'adresse est requise');
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
      
      // Si en ligne, créer d'abord dans Firebase
      if (isConnected) {
        try {
          const firebaseId = await firebaseService.createLocation(locationData);
          
          // Créer localement avec l'ID Firebase
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
          
          console.log(`✅ Emplacement créé avec ID Firebase: ${firebaseId}`);
        } catch (error) {
          console.log('⚠️ Erreur Firebase, création locale:', error);
          
          // Fallback: créer localement
          const localId = await databaseService.insert('locations', locationData);
          await syncService.addToSyncQueue('locations', localId, 'create', locationData);
          
          console.log(`✅ Emplacement créé localement: ${localId}`);
        }
      } else {
        // Mode offline: créer localement
        const localId = await databaseService.insert('locations', locationData);
        await syncService.addToSyncQueue('locations', localId, 'create', locationData);
        
        console.log(`✅ Emplacement créé en mode offline: ${localId}`);
      }
      
      // Recharger les données
      await loadLocations();
      
      // Réinitialiser le formulaire
      setNewLocation({
        name: '',
        address: '',
        location_type: 'warehouse',
        contact_person: '',
        phone: '',
      });
      
      setShowCreateModal(false);
      Alert.alert('Succès', 'Emplacement créé avec succès ! 🏢');
    } catch (error) {
      console.error('Erreur création emplacement:', error);
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

  const filteredLocations = locations.filter(location =>
    !searchQuery ||
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLocation = ({ item }: { item: LocationItem }) => (
    <TouchableOpacity
      style={styles.locationCard}
      onPress={() => router.push(`/entrepots/${item.id}`)}
    >
      <View style={styles.locationHeader}>
        <View style={[styles.locationIcon, { backgroundColor: `${getLocationTypeColor(item.location_type)}20` }]}>
          <Ionicons 
            name={getLocationTypeIcon(item.location_type) as any} 
            size={28} 
            color={getLocationTypeColor(item.location_type)} 
          />
        </View>
        
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationType}>{getLocationTypeLabel(item.location_type)}</Text>
        </View>
        
        {item.sync_status === 'pending' && (
          <View style={styles.syncBadge}>
            <Ionicons name="cloud-upload-outline" size={16} color="#FF9500" />
          </View>
        )}
      </View>

      <View style={styles.locationAddress}>
        <Ionicons name="location-outline" size={14} color="#666" />
        <Text style={styles.addressText}>{item.address}</Text>
      </View>

      {item.contact_person && (
        <View style={styles.locationContact}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.contactText}>{item.contact_person}</Text>
        </View>
      )}

      <View style={styles.locationStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.products_count}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.total_value.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>Valeur (FCFA)</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, item.low_stock_count > 0 && { color: '#FF3B30' }]}>
            {item.low_stock_count}
          </Text>
          <Text style={styles.statLabel}>Alertes</Text>
        </View>
      </View>

      {item.low_stock_count > 0 && (
        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>
            ⚠️ {item.low_stock_count} produit{item.low_stock_count > 1 ? 's' : ''} en stock faible
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && locations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des emplacements...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Entrepôts</Text>
          <TouchableOpacity onPress={() => setShowSearchBar(!showSearchBar)}>
            <Ionicons name="search-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Gestion des emplacements</Text>
        
        {showSearchBar && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un emplacement..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        )}
      </View>

      {/* Liste des emplacements */}
      <FlatList
        data={filteredLocations}
        renderItem={renderLocation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun emplacement</Text>
            <Text style={styles.emptySubtext}>Créez votre premier entrepôt ou magasin</Text>
          </View>
        }
      />

      {/* Bouton FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Modale de Création */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 Nouvel Emplacement</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Nom */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom de l'emplacement *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Entrepôt Central"
                  value={newLocation.name}
                  onChangeText={(text) => setNewLocation({ ...newLocation, name: text })}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Adresse */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adresse *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: 123 Rue de la Paix, Bamako"
                  value={newLocation.address}
                  onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type d'emplacement *</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newLocation.location_type === 'warehouse' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewLocation({ ...newLocation, location_type: 'warehouse' })}
                  >
                    <Ionicons 
                      name="business-outline" 
                      size={20} 
                      color={newLocation.location_type === 'warehouse' ? '#fff' : '#007AFF'} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newLocation.location_type === 'warehouse' && styles.typeButtonTextActive
                    ]}>
                      Entrepôt
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newLocation.location_type === 'store' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewLocation({ ...newLocation, location_type: 'store' })}
                  >
                    <Ionicons 
                      name="storefront-outline" 
                      size={20} 
                      color={newLocation.location_type === 'store' ? '#fff' : '#34C759'} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newLocation.location_type === 'store' && styles.typeButtonTextActive
                    ]}>
                      Magasin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newLocation.location_type === 'supplier' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewLocation({ ...newLocation, location_type: 'supplier' })}
                  >
                    <Ionicons 
                      name="cube-outline" 
                      size={20} 
                      color={newLocation.location_type === 'supplier' ? '#fff' : '#FF9500'} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newLocation.location_type === 'supplier' && styles.typeButtonTextActive
                    ]}>
                      Fournisseur
                    </Text>
                  </TouchableOpacity>
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
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleCreateLocation}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Création...' : 'Créer l\'Emplacement'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bouton temporaire de nettoyage - À SUPPRIMER APRÈS UTILISATION */}
      <ClearDataButton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: dynamicSizes.spacing.lg,
    paddingTop: isTablet ? 50 : 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: dynamicSizes.fontSize.large,
    color: '#666',
    marginTop: dynamicSizes.spacing.xs,
  },
  searchContainer: {
    marginTop: dynamicSizes.spacing.md,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  list: {
    padding: dynamicSizes.spacing.lg,
    paddingBottom: 100,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: dynamicSizes.spacing.lg,
    marginBottom: dynamicSizes.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.md,
  },
  locationIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: dynamicSizes.spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  locationType: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
  },
  syncBadge: {
    padding: dynamicSizes.spacing.xs,
  },
  locationAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.xs,
    gap: dynamicSizes.spacing.xs,
  },
  addressText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    flex: 1,
  },
  locationContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.md,
    gap: dynamicSizes.spacing.xs,
  },
  contactText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
  },
  locationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: dynamicSizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  alertBadge: {
    marginTop: dynamicSizes.spacing.sm,
    backgroundColor: '#FFF4E6',
    padding: dynamicSizes.spacing.sm,
    borderRadius: 6,
  },
  alertBadgeText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#B8860B',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: '600',
    color: '#999',
    marginTop: dynamicSizes.spacing.md,
  },
  emptySubtext: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#ccc',
    marginTop: dynamicSizes.spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Styles de la modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: dynamicSizes.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalBody: {
    padding: dynamicSizes.spacing.lg,
    maxHeight: height * 0.6,
  },
  inputGroup: {
    marginBottom: dynamicSizes.spacing.lg,
  },
  inputLabel: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.sm,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: dynamicSizes.spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dynamicSizes.spacing.xs,
    padding: dynamicSizes.spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: dynamicSizes.spacing.lg,
    gap: dynamicSizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: dynamicSizes.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#1a1a1a',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
  },
});

