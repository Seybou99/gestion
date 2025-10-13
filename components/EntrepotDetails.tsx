import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { databaseService } from '../services/DatabaseService';
import { firebaseService } from '../services/FirebaseService';
import { syncService } from '../services/SyncService';
import { RootState } from '../store';
import { isValidFirebaseId } from '../utils/firebaseIdMapper';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const dynamicSizes = {
  spacing: {
    xs: isTablet ? 6 : 4,
    sm: isTablet ? 12 : 8,
    md: isTablet ? 20 : 16,
    lg: isTablet ? 28 : 20,
    xl: isTablet ? 36 : 28,
  },
  fontSize: {
    small: isTablet ? 16 : 12,
    medium: isTablet ? 18 : 14,
    large: isTablet ? 22 : 16,
    xl: isTablet ? 28 : 20,
  },
};

interface Props {
  locationId: string;
  onClose: () => void;
}

export default function EntrepotDetails({ locationId, onClose }: Props) {
  const { isConnected } = useSelector((state: RootState) => state.network);

  const [location, setLocation] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantity, setMinQuantity] = useState('10');
  const [maxQuantity, setMaxQuantity] = useState('1000');
  
  // Champs pour nouveau produit
  const [newProductName, setNewProductName] = useState('');
  const [newProductCode, setNewProductCode] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductPriceBuy, setNewProductPriceBuy] = useState('');
  const [newProductPriceSell, setNewProductPriceSell] = useState('');

  useEffect(() => {
    loadLocationDetails();
  }, [locationId]);

  const loadLocationDetails = async () => {
    try {
      setLoading(true);
      
      const allLocations = await databaseService.getAll('locations') as any[];
      const foundLocation = allLocations.find(loc => loc.id === locationId);
      
      if (!foundLocation) {
        Alert.alert('Erreur', 'Emplacement introuvable');
        onClose();
        return;
      }
      
      setLocation(foundLocation);
      
      const allInventory = await databaseService.getAll('inventory') as any[];
      const locationInventory = allInventory.filter(inv => inv.location_id === locationId);
      
      const allProducts = await databaseService.getAll('products') as any[];
      setProducts(allProducts);
      
      const enrichedInventory = locationInventory.map(inv => {
        const product = allProducts.find(p => p.id === inv.product_id);
        return {
          ...inv,
          product_name: product?.name || 'Produit inconnu',
          product_code: product?.code,
          product_price: product?.price_sell,
        };
      });
      
      setInventory(enrichedInventory);
      console.log(`📦 ${enrichedInventory.length} produits dans l'inventaire`);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      let productId = selectedProduct;
      
      // Si on crée un nouveau produit
      if (isCreatingNewProduct) {
        if (!newProductName.trim()) {
          Alert.alert('Erreur', 'Le nom du produit est requis');
          return;
        }
        
        const priceBuy = parseFloat(newProductPriceBuy) || 0;
        const priceSell = parseFloat(newProductPriceSell) || 0;
        
        if (priceSell < 0 || priceBuy < 0) {
          Alert.alert('Erreur', 'Les prix doivent être positifs');
          return;
        }
        
        setLoading(true);
        console.log('🆕 Création d\'un nouveau produit pour l\'entrepôt');
        
        // Calcul de la marge (optionnel)
        const margin = (priceBuy > 0 && priceSell > 0) ? ((priceSell - priceBuy) / priceBuy) * 100 : undefined;
        
        // Données du produit (SANS quantité - c'est inventory qui gère ça)
        const productData = {
          name: newProductName.trim(),
          code: newProductCode.trim() || undefined,
          category_id: newProductCategory.trim() || undefined,
          description: '',
          price_buy: priceBuy,
          price_sell: priceSell,
          ...(margin != null && { margin }), // Ajouter margin seulement s'il existe
          barcode: '',
          image_url: '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'pending' as const,
        };
        
        // Créer le produit en ligne ou hors ligne
        if (isConnected) {
          try {
            console.log('🌐 Mode ONLINE - Création produit Firebase d\'abord');
            const firebaseProductId = await firebaseService.createProduct(productData);
            console.log('✅ Produit créé dans Firebase, ID:', firebaseProductId);
            
            // Utiliser l'ID Firebase comme ID local
            const productWithFirebaseId = {
              ...productData,
              id: firebaseProductId,
              firebase_id: firebaseProductId,
              sync_status: 'synced' as const,
            };
            
            const existingProducts = await AsyncStorage.getItem('products');
            const productsArray = existingProducts ? JSON.parse(existingProducts) : [];
            productsArray.push(productWithFirebaseId);
            await AsyncStorage.setItem('products', JSON.stringify(productsArray));
            databaseService.invalidateCache('products');
            
            productId = firebaseProductId;
            console.log('✅ Produit sauvegardé localement avec ID Firebase:', productId);
          } catch (error: any) {
            console.log('⚠️ Échec Firebase, création locale:', error.message);
            const localProductId = await databaseService.insert('products', productData);
            await syncService.addToSyncQueue('products', localProductId, 'create', productData);
            productId = localProductId;
          }
        } else {
          console.log('📱 Mode OFFLINE - Création produit locale');
          const localProductId = await databaseService.insert('products', productData);
          await syncService.addToSyncQueue('products', localProductId, 'create', productData);
          productId = localProductId;
          console.log('✅ Produit créé localement, ID:', productId);
        }
      } else {
        // Produit existant sélectionné
        if (!selectedProduct) {
          Alert.alert('Erreur', 'Veuillez sélectionner un produit');
          return;
        }
      }
      
      // Validation des quantités
      const qty = parseInt(quantity) || 0;
      const minQty = parseInt(minQuantity) || 0;
      const maxQty = parseInt(maxQuantity) || 100;
      
      if (qty < 0 || minQty < 0 || maxQty < 0) {
        Alert.alert('Erreur', 'Les quantités doivent être positives');
        return;
      }
      
      if (!loading) setLoading(true);
      console.log('📦 Création de l\'inventaire pour le produit:', productId);
      
      // Créer l'entrée d'inventaire (avec les quantités)
      const inventoryData = {
        product_id: productId,
        location_id: locationId,
        quantity_available: qty,
        quantity_reserved: 0,
        quantity_min: minQty,
        quantity_max: maxQty,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'initial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };
      
      if (isConnected) {
        try {
          console.log('🌐 Mode ONLINE - Création inventaire Firebase');
          const firebaseInventoryId = await firebaseService.createInventory(inventoryData);
          console.log('✅ Inventaire créé dans Firebase, ID:', firebaseInventoryId);
          
          const inventoryWithFirebaseId = {
            ...inventoryData,
            id: firebaseInventoryId,
            firebase_id: firebaseInventoryId,
            sync_status: 'synced' as const,
          };
          
          const existingInventory = await AsyncStorage.getItem('inventory');
          const inventoryArray = existingInventory ? JSON.parse(existingInventory) : [];
          inventoryArray.push(inventoryWithFirebaseId);
          await AsyncStorage.setItem('inventory', JSON.stringify(inventoryArray));
          databaseService.invalidateCache('inventory');
          console.log('✅ Inventaire sauvegardé localement avec ID Firebase');
        } catch (error: any) {
          console.log('⚠️ Échec Firebase inventaire, création locale:', error.message);
          const localInventoryId = await databaseService.insert('inventory', inventoryData);
          await syncService.addToSyncQueue('inventory', localInventoryId, 'create', inventoryData);
        }
      } else {
        console.log('📱 Mode OFFLINE - Création inventaire locale');
        const localInventoryId = await databaseService.insert('inventory', inventoryData);
        await syncService.addToSyncQueue('inventory', localInventoryId, 'create', inventoryData);
        console.log('✅ Inventaire créé localement, ajouté à la file de sync');
      }
      
      await loadLocationDetails();
      resetForm();
      setShowAddModal(false);
      
      const message = isCreatingNewProduct 
        ? 'Nouveau produit créé et ajouté à l\'inventaire ! 🎉'
        : 'Produit ajouté à l\'inventaire ! 📦';
      Alert.alert('Succès', message);
    } catch (error) {
      console.error('❌ Erreur ajout produit:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setIsCreatingNewProduct(false);
    setSelectedProduct('');
    setQuantity('0');
    setMinQuantity('10');
    setMaxQuantity('1000');
    setNewProductName('');
    setNewProductCode('');
    setNewProductCategory('');
    setNewProductPriceBuy('');
    setNewProductPriceSell('');
  };

  const handleDeleteInventory = async (inventoryId: string) => {
    Alert.alert(
      'Confirmer',
      'Supprimer ce produit de l\'inventaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const inventoryItem = await databaseService.getById('inventory', inventoryId);
              if (!inventoryItem) {
                Alert.alert('Erreur', 'Produit d\'inventaire introuvable.');
                return;
              }

              // Supprimer localement d'abord
              await databaseService.delete('inventory', inventoryId);
              databaseService.invalidateCache('inventory');

              // Gérer la synchronisation selon le mode
              if (isConnected) {
                try {
                  // Si connecté et a un firebase_id, supprimer de Firebase
                  if (inventoryItem.firebase_id) {
                    await firebaseService.deleteInventory(inventoryItem.firebase_id);
                  }
                } catch (error: any) {
                  // Si Firebase échoue, ajouter à la queue de sync
                  const firebaseId = inventoryItem.firebase_id || (isValidFirebaseId(inventoryId) ? inventoryId : null);
                  await syncService.addToSyncQueue('inventory', inventoryId, 'delete', { firebase_id: firebaseId });
                }
              } else {
                // Mode offline : ajouter à la queue de sync
                const firebaseId = inventoryItem.firebase_id || (isValidFirebaseId(inventoryId) ? inventoryId : null);
                await syncService.addToSyncQueue('inventory', inventoryId, 'delete', { firebase_id: firebaseId });
              }

              Alert.alert('Succès', 'Produit supprimé de l\'inventaire.');
              await loadLocationDetails();
            } catch (error) {
              console.error('Erreur suppression inventaire:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit de l\'inventaire.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getAvailableProducts = () => {
    const inventoryProductIds = inventory.map(inv => inv.product_id);
    return products.filter(p => !inventoryProductIds.includes(p.id));
  };

  const getStatusColor = (item: any) => {
    if (item.quantity_available === 0) return '#FF3B30';
    if (item.quantity_available < item.quantity_min) return '#FF9500';
    return '#34C759';
  };

  const getStatusLabel = (item: any) => {
    if (item.quantity_available === 0) return 'Rupture';
    if (item.quantity_available < item.quantity_min) return 'Stock faible';
    return 'Bon';
  };

  const getTotalValue = () => {
    return inventory.reduce((sum, inv) => sum + (inv.quantity_available * (inv.product_price || 0)), 0);
  };

  const getLowStockCount = () => {
    return inventory.filter(inv => inv.quantity_available < inv.quantity_min).length;
  };

  const renderInventoryItem = ({ item }: { item: any }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryHeader}>
        <View style={styles.inventoryInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          {item.product_code && <Text style={styles.productCode}>Code: {item.product_code}</Text>}
        </View>
        <TouchableOpacity onPress={() => handleDeleteInventory(item.id)}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.inventoryStats}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Disponible</Text>
          <Text style={[styles.statValue, { color: getStatusColor(item) }]}>
            {item.quantity_available}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Réservé</Text>
          <Text style={styles.statValue}>{item.quantity_reserved || 0}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Min / Max</Text>
          <Text style={styles.statValue}>{item.quantity_min} / {item.quantity_max}</Text>
        </View>
      </View>
      
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
          {getStatusLabel(item)}
        </Text>
      </View>
    </View>
  );

  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="close" size={32} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{location.name}</Text>
          <Text style={styles.subtitle}>{location.address}</Text>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{inventory.length}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{getTotalValue().toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>Valeur totale</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, getLowStockCount() > 0 && { color: '#FF3B30' }]}>
            {getLowStockCount()}
          </Text>
          <Text style={styles.statLabel}>Alertes</Text>
        </View>
      </View>

      {/* Liste d'inventaire */}
      <FlatList
        data={inventory}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun produit</Text>
            <Text style={styles.emptySubtext}>Ajoutez des produits à cet entrepôt</Text>
          </View>
        }
      />

      {/* Bouton Ajouter */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={async () => {
          // Recharger les produits pour avoir la liste complète
          databaseService.invalidateCache('products');
          const allProducts = await databaseService.getAll('products') as any[];
          setProducts(allProducts);
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Modale Ajout Produit */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCreatingNewProduct ? '🆕 Nouveau Produit' : '📦 Ajouter un Produit'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {/* Toggle Nouveau / Existant */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !isCreatingNewProduct && styles.toggleButtonActive]}
                  onPress={() => setIsCreatingNewProduct(false)}
                >
                  <Text style={[styles.toggleText, !isCreatingNewProduct && styles.toggleTextActive]}>
                    Produit existant
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, isCreatingNewProduct && styles.toggleButtonActive]}
                  onPress={() => setIsCreatingNewProduct(true)}
                >
                  <Text style={[styles.toggleText, isCreatingNewProduct && styles.toggleTextActive]}>
                    Nouveau produit
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Formulaire Nouveau Produit */}
              {isCreatingNewProduct ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom du produit *</Text>
                    <TextInput
                      style={styles.input}
                      value={newProductName}
                      onChangeText={setNewProductName}
                      placeholder="Ex: iPhone 15 Pro"
                    />
                  </View>
                  
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Code produit</Text>
                      <TextInput
                        style={styles.input}
                        value={newProductCode}
                        onChangeText={setNewProductCode}
                        placeholder="Ex: IP15P"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Catégorie</Text>
                      <TextInput
                        style={styles.input}
                        value={newProductCategory}
                        onChangeText={setNewProductCategory}
                        placeholder="Ex: Téléphones"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Prix d'achat *</Text>
                      <TextInput
                        style={styles.input}
                        value={newProductPriceBuy}
                        onChangeText={setNewProductPriceBuy}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Prix de vente *</Text>
                      <TextInput
                        style={styles.input}
                        value={newProductPriceSell}
                        onChangeText={setNewProductPriceSell}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </View>
                </>
              ) : (
                /* Formulaire Produit Existant */
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sélectionner un produit *</Text>
                  <View style={styles.pickerContainer}>
                    {getAvailableProducts().length === 0 ? (
                      <Text style={styles.noProductsText}>Tous les produits sont déjà dans l'inventaire</Text>
                    ) : (
                      <FlatList
                        data={getAvailableProducts()}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[styles.productOption, selectedProduct === item.id && styles.productOptionSelected]}
                            onPress={() => setSelectedProduct(item.id)}
                          >
                            <Text style={[styles.productOptionText, selectedProduct === item.id && styles.productOptionTextSelected]}>
                              {item.name} {item.code ? `(${item.code})` : ''}
                            </Text>
                            {selectedProduct === item.id && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                          </TouchableOpacity>
                        )}
                        style={styles.productList}
                      />
                    )}
                  </View>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantité initiale *</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Seuil minimum *</Text>
                  <TextInput
                    style={styles.input}
                    value={minQuantity}
                    onChangeText={setMinQuantity}
                    keyboardType="numeric"
                    placeholder="10"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Capacité max *</Text>
                  <TextInput
                    style={styles.input}
                    value={maxQuantity}
                    onChangeText={setMaxQuantity}
                    keyboardType="numeric"
                    placeholder="1000"
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddProduct}
                disabled={loading || (!isCreatingNewProduct && !selectedProduct) || (isCreatingNewProduct && !newProductName.trim())}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: dynamicSizes.spacing.lg,
    paddingTop: dynamicSizes.spacing.xl + 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { marginRight: dynamicSizes.spacing.md },
  headerInfo: { flex: 1 },
  title: { fontSize: dynamicSizes.fontSize.xl, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: dynamicSizes.fontSize.medium, color: '#666', marginTop: 4 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: dynamicSizes.spacing.lg,
    padding: dynamicSizes.spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: dynamicSizes.fontSize.xl, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: dynamicSizes.fontSize.small, color: '#999', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e0e0e0' },
  list: { padding: dynamicSizes.spacing.lg, paddingBottom: 100 },
  inventoryCard: {
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
  inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: dynamicSizes.spacing.md },
  inventoryInfo: { flex: 1 },
  productName: { fontSize: dynamicSizes.fontSize.large, fontWeight: '600', color: '#1a1a1a' },
  productCode: { fontSize: dynamicSizes.fontSize.small, color: '#999', marginTop: 2 },
  inventoryStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: dynamicSizes.spacing.md },
  statBox: { alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: dynamicSizes.spacing.sm, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: dynamicSizes.spacing.xs },
  statusText: { fontSize: dynamicSizes.fontSize.small, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: dynamicSizes.fontSize.large, color: '#999', marginTop: dynamicSizes.spacing.md },
  emptySubtext: { fontSize: dynamicSizes.fontSize.medium, color: '#ccc', marginTop: dynamicSizes.spacing.xs },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
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
  toggleContainer: {
    flexDirection: 'row',
    gap: dynamicSizes.spacing.sm,
    marginBottom: dynamicSizes.spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: dynamicSizes.spacing.sm,
    paddingHorizontal: dynamicSizes.spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleText: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  inputGroup: { marginBottom: dynamicSizes.spacing.lg },
  inputRow: { flexDirection: 'row', gap: dynamicSizes.spacing.md },
  inputLabel: { fontSize: dynamicSizes.fontSize.medium, fontWeight: '600', color: '#1a1a1a', marginBottom: dynamicSizes.spacing.sm },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    fontSize: dynamicSizes.fontSize.medium,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerContainer: { maxHeight: 150 },
  productList: { maxHeight: 150 },
  productOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: dynamicSizes.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: dynamicSizes.spacing.xs,
  },
  productOptionSelected: { backgroundColor: '#E3F2FD', borderColor: '#007AFF' },
  productOptionText: { fontSize: dynamicSizes.fontSize.medium, color: '#1a1a1a' },
  productOptionTextSelected: { color: '#007AFF', fontWeight: '600' },
  noProductsText: { fontSize: dynamicSizes.fontSize.medium, color: '#999', textAlign: 'center', padding: dynamicSizes.spacing.lg },
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
});

