import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { syncService } from '../../services/SyncService';
import { RootState } from '../../store';

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

export default function EntrepotDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isConnected } = useSelector((state: RootState) => state.network);

  const [location, setLocation] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantity, setMinQuantity] = useState('10');
  const [maxQuantity, setMaxQuantity] = useState('1000');
  
  // Nouveaux états pour l'historique des mouvements
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [movements, setMovements] = useState<any[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    loadLocationDetails();
    loadMovements();
  }, [id]);

  const loadMovements = async () => {
    try {
      const allMovements = await databaseService.getAll('stock_movements') as any[];
      const locationMovements = allMovements
        .filter(mov => mov.location_id === id)
        .sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime());
      setMovements(locationMovements);
    } catch (error) {
      console.error('Erreur chargement mouvements:', error);
    }
  };

  // Fonction utilitaire pour créer un mouvement de stock
  const createStockMovement = async (
    productId: string,
    productName: string,
    quantity: number,
    quantityBefore: number,
    movementType: 'entry' | 'adjustment',
    notes?: string
  ) => {
    try {
      const { generateCreatedByFields } = await import('../../utils/userInfo');
      const createdByFields = await generateCreatedByFields();
      
      // Générer le numéro de mouvement
      const allMovements = await databaseService.getAll('stock_movements') as any[];
      const year = new Date().getFullYear();
      const prefix = `MOV-${year}-`;
      const lastNumber = allMovements
        .map(m => m.movement_number)
        .filter(n => n?.startsWith(prefix))
        .sort()
        .reverse()[0];
      
      const lastNum = lastNumber ? parseInt(lastNumber.split('-')[2]) : 0;
      const movementNumber = `${prefix}${(lastNum + 1).toString().padStart(4, '0')}`;
      
      const movement = {
        movement_number: movementNumber,
        movement_date: new Date().toISOString(),
        movement_type: movementType,
        location_id: id as string,
        product_id: productId,
        product_name: productName,
        quantity: quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityBefore + quantity,
        notes: notes,
        ...createdByFields,
        sync_status: 'pending' as const,
      };
      
      await databaseService.insert('stock_movements', movement);
      await loadMovements(); // Recharger la liste
    } catch (error) {
      console.error('Erreur création mouvement:', error);
    }
  };

  const loadLocationDetails = async () => {
    try {
      setLoading(true);
      
      // Charger l'emplacement
      const allLocations = await databaseService.getAll('locations') as any[];
      const foundLocation = allLocations.find(loc => loc.id === id);
      
      if (!foundLocation) {
        Alert.alert('Erreur', 'Emplacement introuvable');
        router.back();
        return;
      }
      
      setLocation(foundLocation);
      
      // Charger l'inventaire de cet emplacement
      const allInventory = await databaseService.getAll('inventory') as any[];
      const locationInventory = allInventory.filter(inv => inv.location_id === id);
      
      // Charger tous les produits
      const allProducts = await databaseService.getAll('products') as any[];
      setProducts(allProducts);
      
      // Enrichir l'inventaire avec les infos produits
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
      if (!selectedProduct) {
        Alert.alert('Erreur', 'Veuillez sélectionner un produit');
        return;
      }
      
      const qty = parseInt(quantity) || 0;
      const minQty = parseInt(minQuantity) || 0;
      const maxQty = parseInt(maxQuantity) || 100;
      
      if (qty < 0 || minQty < 0 || maxQty < 0) {
        Alert.alert('Erreur', 'Les quantités doivent être positives');
        return;
      }
      
      setLoading(true);
      
      const inventoryData = {
        product_id: selectedProduct,
        location_id: id as string,
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
          const firebaseId = await firebaseService.createInventory(inventoryData);
          
          const inventoryWithFirebaseId = {
            ...inventoryData,
            id: firebaseId,
            firebase_id: firebaseId,
            sync_status: 'synced' as const,
          };
          
          const existing = await AsyncStorage.getItem('inventory');
          const items = existing ? JSON.parse(existing) : [];
          items.push(inventoryWithFirebaseId);
          await AsyncStorage.setItem('inventory', JSON.stringify(items));
          databaseService.invalidateCache('inventory');
        } catch (error) {
          const localId = await databaseService.insert('inventory', inventoryData);
          await syncService.addToSyncQueue('inventory', localId, 'create', inventoryData);
        }
      } else {
        const localId = await databaseService.insert('inventory', inventoryData);
        await syncService.addToSyncQueue('inventory', localId, 'create', inventoryData);
      }
      
      // 🆕 CRÉER UN MOUVEMENT DE STOCK
      const product = products.find(p => p.id === selectedProduct);
      if (product && qty > 0) {
        await createStockMovement(
          selectedProduct,
          product.name,
          qty,
          0, // quantité avant = 0 car c'est un nouveau produit
          'entry',
          'Ajout initial du produit dans l\'entrepôt'
        );
      }
      
      await loadLocationDetails();
      setShowAddModal(false);
      setSelectedProduct('');
      setQuantity('0');
      setMinQuantity('10');
      setMaxQuantity('1000');
      Alert.alert('Succès', 'Produit ajouté à l\'inventaire ! 📦');
    } catch (error) {
      console.error('Erreur ajout produit:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    } finally {
      setLoading(false);
    }
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
              const item = inventory.find(inv => inv.id === inventoryId);
              
              if (isConnected && item?.firebase_id) {
                await firebaseService.deleteInventory(item.firebase_id);
              }
              
              await databaseService.delete('inventory', inventoryId);
              databaseService.invalidateCache('inventory');
              
              if (!isConnected) {
                await syncService.addToSyncQueue('inventory', inventoryId, 'delete', {});
              }
              
              await loadLocationDetails();
              Alert.alert('Succès', 'Produit supprimé de l\'inventaire');
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handleAdjustQuantity = async () => {
    try {
      if (!adjustProduct || !adjustQuantity || !adjustReason) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
      }
      
      const qty = parseInt(adjustQuantity);
      if (isNaN(qty) || qty === 0) {
        Alert.alert('Erreur', 'Quantité invalide');
        return;
      }
      
      setLoading(true);
      
      const newQuantity = adjustProduct.quantity_available + qty;
      
      if (newQuantity < 0) {
        Alert.alert('Erreur', 'Stock insuffisant pour cette sortie');
        setLoading(false);
        return;
      }
      
      // Mettre à jour l'inventaire
      await databaseService.update('inventory', adjustProduct.id, {
        quantity_available: newQuantity,
        last_movement_date: new Date().toISOString(),
        last_movement_type: 'adjustment',
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      });
      
      // Créer le mouvement
      await createStockMovement(
        adjustProduct.product_id,
        adjustProduct.product_name,
        qty,
        adjustProduct.quantity_available,
        'adjustment',
        adjustReason
      );
      
      // Synchroniser si connecté
      if (isConnected) {
        await syncService.addToSyncQueue('inventory', adjustProduct.id, 'update', {
          quantity_available: newQuantity,
          last_movement_date: new Date().toISOString(),
          last_movement_type: 'adjustment',
        });
      }
      
      await loadLocationDetails();
      setShowAdjustModal(false);
      setAdjustProduct(null);
      setAdjustQuantity('');
      setAdjustReason('');
      
      Alert.alert('Succès', 'Quantité ajustée avec succès');
    } catch (error) {
      console.error('Erreur ajustement:', error);
      Alert.alert('Erreur', 'Impossible d\'ajuster la quantité');
    } finally {
      setLoading(false);
    }
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
      
      {/* 🆕 BOUTONS D'AJUSTEMENT RAPIDE */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickButton, styles.quickButtonRemove]}
          onPress={() => {
            setAdjustProduct(item);
            setAdjustQuantity('-10');
            setAdjustReason('Sortie manuelle');
            setShowAdjustModal(true);
          }}
        >
          <Ionicons name="remove-circle" size={20} color="#FF3B30" />
          <Text style={styles.quickButtonText}>-10</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickButton, styles.quickButtonAdd]}
          onPress={() => {
            setAdjustProduct(item);
            setAdjustQuantity('+10');
            setAdjustReason('Entrée manuelle');
            setShowAdjustModal(true);
          }}
        >
          <Ionicons name="add-circle" size={20} color="#34C759" />
          <Text style={styles.quickButtonText}>+10</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickButton, styles.quickButtonAdjust]}
          onPress={() => {
            setAdjustProduct(item);
            setAdjustQuantity('');
            setAdjustReason('');
            setShowAdjustModal(true);
          }}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.quickButtonText}>Ajuster</Text>
        </TouchableOpacity>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#007AFF" />
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

      {/* 🆕 ONGLETS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Ionicons 
            name="cube" 
            size={20} 
            color={activeTab === 'inventory' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            Inventaire
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={activeTab === 'history' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Historique ({movements.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste d'inventaire OU Historique */}
      {activeTab === 'inventory' ? (
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
      ) : (
        <FlatList
          data={movements}
          renderItem={({ item }) => (
            <View style={styles.movementCard}>
              <View style={styles.movementHeader}>
                <View style={styles.movementLeft}>
                  <Ionicons 
                    name={item.quantity >= 0 ? "arrow-down-circle" : "arrow-up-circle"} 
                    size={24} 
                    color={item.quantity >= 0 ? "#34C759" : "#FF3B30"} 
                  />
                  <View style={styles.movementInfo}>
                    <Text style={styles.movementProduct}>{item.product_name}</Text>
                    <Text style={styles.movementNumber}>{item.movement_number}</Text>
                  </View>
                </View>
                <View style={styles.movementRight}>
                  <Text style={[
                    styles.movementQuantity, 
                    { color: item.quantity >= 0 ? "#34C759" : "#FF3B30" }
                  ]}>
                    {item.quantity >= 0 ? '+' : ''}{item.quantity}
                  </Text>
                  <Text style={styles.movementType}>
                    {item.movement_type === 'entry' ? 'Entrée' : 'Ajustement'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.movementDetails}>
                <Text style={styles.movementStock}>
                  Stock: {item.quantity_before} → {item.quantity_after}
                </Text>
                {item.notes && (
                  <Text style={styles.movementNotes}>{item.notes}</Text>
                )}
              </View>
              
              <View style={styles.movementFooter}>
                <Text style={styles.movementDate}>
                  {new Date(item.movement_date).toLocaleString('fr-FR')}
                </Text>
                <Text style={styles.movementUser}>
                  par {item.created_by_name || 'Utilisateur'}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Aucun mouvement</Text>
              <Text style={styles.emptySubtext}>L'historique apparaîtra ici</Text>
            </View>
          }
        />
      )}

      {/* Bouton Ajouter */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Modale Ajout Produit */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Ajouter un Produit</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Produit *</Text>
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
            </ScrollView>
            
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
                disabled={loading || !selectedProduct}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🆕 MODALE D'AJUSTEMENT DE QUANTITÉ */}
      <Modal visible={showAdjustModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Ajuster le Stock</Text>
              <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {adjustProduct && (
                <>
                  <Text style={styles.fieldLabel}>Produit</Text>
                  <View style={styles.productInfo}>
                    <Text style={styles.productInfoText}>{adjustProduct.product_name}</Text>
                    <Text style={styles.productInfoStock}>
                      Stock actuel: {adjustProduct.quantity_available}
                    </Text>
                  </View>
                  
                  <Text style={styles.fieldLabel}>Quantité à ajouter/retirer</Text>
                  <Text style={styles.fieldHint}>
                    Utilisez + pour ajouter, - pour retirer (ex: +50, -20)
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: +50 ou -20"
                    value={adjustQuantity}
                    onChangeText={setAdjustQuantity}
                    keyboardType="numeric"
                  />
                  
                  <Text style={styles.fieldLabel}>Motif *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Raison de l'ajustement..."
                    value={adjustReason}
                    onChangeText={setAdjustReason}
                    multiline
                    numberOfLines={3}
                  />
                  
                  {/* Raccourcis */}
                  <Text style={styles.fieldLabel}>Raccourcis</Text>
                  <View style={styles.shortcutsRow}>
                    {[
                      { label: 'Perte', qty: '-10', reason: 'Perte de marchandise' },
                      { label: 'Casse', qty: '-5', reason: 'Produit cassé' },
                      { label: 'Réception', qty: '+50', reason: 'Réception de stock' },
                      { label: 'Correction', qty: '+10', reason: 'Correction d\'inventaire' },
                    ].map((shortcut) => (
                      <TouchableOpacity
                        key={shortcut.label}
                        style={styles.shortcutButton}
                        onPress={() => {
                          setAdjustQuantity(shortcut.qty);
                          setAdjustReason(shortcut.reason);
                        }}
                      >
                        <Text style={styles.shortcutText}>{shortcut.label}</Text>
                        <Text style={styles.shortcutQty}>{shortcut.qty}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAdjustModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAdjustQuantity}
                disabled={loading || !adjustQuantity || !adjustReason}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
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
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Espace supplémentaire pour le clavier
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
  
  // 🆕 STYLES POUR LES ONGLETS
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: dynamicSizes.spacing.lg,
    marginTop: dynamicSizes.spacing.md,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: dynamicSizes.spacing.md,
    borderRadius: 8,
    gap: dynamicSizes.spacing.xs,
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // 🆕 STYLES POUR LES MOUVEMENTS
  movementCard: {
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
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.sm,
  },
  movementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dynamicSizes.spacing.sm,
    flex: 1,
  },
  movementInfo: {
    flex: 1,
  },
  movementProduct: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  movementNumber: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
    marginTop: 2,
  },
  movementRight: {
    alignItems: 'flex-end',
  },
  movementQuantity: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: 'bold',
  },
  movementType: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginTop: 2,
  },
  movementDetails: {
    marginBottom: dynamicSizes.spacing.sm,
  },
  movementStock: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginBottom: 4,
  },
  movementNotes: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    fontStyle: 'italic',
  },
  movementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementDate: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
  },
  movementUser: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#999',
  },
  
  // 🆕 STYLES POUR LES BOUTONS D'AJUSTEMENT RAPIDE
  quickActions: {
    flexDirection: 'row',
    gap: dynamicSizes.spacing.sm,
    marginTop: dynamicSizes.spacing.md,
    paddingTop: dynamicSizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: dynamicSizes.spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  quickButtonAdd: {
    backgroundColor: '#E8F5E8',
  },
  quickButtonRemove: {
    backgroundColor: '#FFEBEB',
  },
  quickButtonAdjust: {
    backgroundColor: '#E3F2FD',
  },
  quickButtonText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
  },
  
  // 🆕 STYLES POUR LA MODALE D'AJUSTEMENT
  productInfo: {
    backgroundColor: '#f8f9fa',
    padding: dynamicSizes.spacing.md,
    borderRadius: 8,
    marginBottom: dynamicSizes.spacing.md,
  },
  productInfoText: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productInfoStock: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.xs,
  },
  fieldHint: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginBottom: dynamicSizes.spacing.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dynamicSizes.spacing.sm,
  },
  shortcutButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: dynamicSizes.spacing.sm,
    paddingHorizontal: dynamicSizes.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: '48%',
  },
  shortcutText: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  shortcutQty: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    marginTop: 2,
  },
});
