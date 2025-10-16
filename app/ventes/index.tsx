import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { QRScanner } from '../../components/QRScanner';
import { databaseService } from '../../services/DatabaseService';
import { syncService } from '../../services/SyncService';
import { AppDispatch, RootState } from '../../store';
import { fetchProducts, updateStockLocally } from '../../store/slices/productSlice';
import { getCurrentUser } from '../../utils/userInfo';

const { width, height } = Dimensions.get('window');

// Breakpoints responsive
const isTablet = width > 768;
const isDesktop = width > 1024;
const isLargeScreen = width > 1200;

// Tailles dynamiques basées sur la largeur d'écran
const dynamicSizes = {
  fontSize: {
    small: Math.max(12, width * 0.03),
    medium: Math.max(14, width * 0.035),
    large: Math.max(16, width * 0.04),
    xlarge: Math.max(18, width * 0.045),
  },
  spacing: {
    xs: Math.max(4, width * 0.01),
    sm: Math.max(8, width * 0.02),
    md: Math.max(12, width * 0.03),
    lg: Math.max(16, width * 0.04),
    xl: Math.max(20, width * 0.05),
  },
  button: {
    size: Math.max(24, width * 0.06),
    padding: Math.max(8, width * 0.02),
  }
};

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  customer_type: 'retail' | 'wholesale';
}

/**
 * Écran Point de Vente (POS) - Système de Vente Complet
 * 
 * Interface de caisse moderne avec gestion du panier,
 * clients et facturation.
 */
export default function VentesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { products } = useSelector((state: RootState) => state.products);
  const { user } = useSelector((state: RootState) => state.auth);
  const { isConnected } = useSelector((state: RootState) => state.network);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing'>('synced');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'retail' as 'retail' | 'wholesale',
    credit_limit: 0,
    credit_balance: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Synchronisation automatique quand la connexion est rétablie
  useEffect(() => {
    if (isConnected) {
      const syncPendingSales = async () => {
        try {
          setSyncStatus('syncing');
          console.log('🔄 Synchronisation automatique des ventes...');
          await syncService.startSync();
          setSyncStatus('synced');
          console.log('✅ Synchronisation des ventes terminée');
        } catch (error) {
          setSyncStatus('pending');
          console.error('❌ Erreur synchronisation automatique:', error);
        }
      };
      
      syncPendingSales();
    } else {
      setSyncStatus('pending');
    }
  }, [isConnected]);

  const loadData = async () => {
    try {
      setLoading(true);
      await dispatch(fetchProducts());
      
      // Charger les clients depuis la base de données locale (exclure ceux marqués pour suppression)
      const allCustomers = await (async () => {
        const user = await getCurrentUser();
        if (!user) {
          console.warn('⚠️ Utilisateur non connecté pour customers');
          return [];
        }
        return await databaseService.getAllByUser('customers', user.uid);
      })() as Customer[];
      const customersData = allCustomers.filter(customer => !(customer as any).to_delete);
      setCustomers(customersData);
      
      console.log(`👥 ${customersData.length} clients chargés`);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour nettoyer les anciens clients et recharger
  const resetCustomers = async () => {
    try {
      Alert.alert(
        'Réinitialiser les Clients ?',
        'Cela supprimera tous les clients locaux. Les clients synchronisés dans Firebase seront préservés.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Réinitialiser',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              console.log('🧹 Nettoyage des clients en dur...');
              
              // Vider la table customers locale directement avec AsyncStorage
              await AsyncStorage.setItem('customers', JSON.stringify([]));
              
              console.log('✅ Clients locaux supprimés');
              
              // Recharger
              await loadData();
              setLoading(false);
              Alert.alert('Succès', 'Clients réinitialisés ! Créez vos clients via le bouton +');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erreur réinitialisation clients:', error);
      Alert.alert('Erreur', 'Impossible de réinitialiser les clients');
    }
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        name: product.name,
        price: product.price_sell,
        quantity: 1,
        total: product.price_sell,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity,
          total: item.price * quantity,
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.total, 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleQRScan = (data: string) => {
    console.log('🔍 QR Code scanné:', data);
    
    // Fermer le scanner
    setShowQRScanner(false);
    
    // Analyser le contenu du QR Code
    try {
      // Essayer de parser le JSON (au cas où c'est un QR code généré par l'app)
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        // Si ce n'est pas du JSON, essayer de parser une deuxième fois (double encodage)
        try {
          parsedData = JSON.parse(JSON.parse(data));
        } catch {
          // Si ce n'est toujours pas du JSON, traiter comme un code-barres simple
          parsedData = { barcode: data };
        }
      }
      
      // Chercher le produit par code-barres ou SKU
      const product = products.find(p => 
        p.barcode === parsedData.barcode || 
        p.sku === parsedData.sku ||
        p.barcode === data ||
        p.sku === data
      );
      
      if (product) {
        // Ajouter le produit au panier
        addToCart(product);
        Alert.alert(
          'Produit trouvé !',
          `${product.name} ajouté au panier`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Produit non trouvé',
          'Aucun produit correspondant à ce code-barres',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors du scan QR:', error);
      Alert.alert('Erreur', 'Impossible de traiter le code scanné');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const processSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Erreur', 'Le panier est vide');
      return;
    }

    try {
      setLoading(true);
      
      // Debug de l'utilisateur
      console.log('🔍 [DEBUG] Utilisateur actuel:', user);
      console.log('🔍 [DEBUG] isConnected:', isConnected);
      
      // Créer un utilisateur par défaut si nécessaire
      const defaultUser = {
        uid: 'default-user-pos',
        displayName: 'Vendeur POS',
        email: 'pos@gestion.com'
      };
      
      const currentUser = user || defaultUser;
      
      // Créer la vente avec informations utilisateur
      const saleData = {
        user_id: currentUser.uid,
        customer_id: selectedCustomer?.id || null,
        location_id: 'default_location',
        total_amount: getCartTotal(),
        tax_amount: getCartTotal() * 0.18, // TVA 18% au Mali
        discount_amount: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        sale_date: new Date().toISOString(),
        created_by: currentUser.uid,
        created_by_name: currentUser.displayName || currentUser.email || 'Utilisateur POS',
        notes: `Vente POS - ${cart.length} articles`,
        sync_status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('🔍 [DEBUG] Données de vente:', saleData);

      const saleId = await databaseService.insert('sales', saleData);

      // Créer les items de vente
      for (const item of cart) {
        await databaseService.insert('sale_items', {
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total,
        });

        // Mettre à jour le stock
        const stockItems = await databaseService.query('SELECT * FROM stock WHERE product_id = ?', [item.product_id]);
        if (stockItems.length > 0) {
          const stockItem = stockItems[0] as any;
          const newStock = stockItem.quantity_current - item.quantity;
          
          await databaseService.update('stock', stockItem.id, {
            quantity_current: newStock,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'out',
            sync_status: 'pending',
          });
          
          // Ajouter la mise à jour de stock à la queue de synchronisation
          console.log('🔍 [DEBUG] Ajout mise à jour stock à la queue:', {
            table: 'stock',
            id: stockItem.id,
            operation: 'update',
            data: {
              quantity_current: newStock,
              last_movement_date: new Date().toISOString(),
              last_movement_type: 'out',
            }
          });
          
          await syncService.addToSyncQueue('stock', stockItem.id, 'update', {
            product_id: item.product_id,  // Important : inclure le product_id pour Firebase
            quantity_current: newStock,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'out',
          });
          
          // Mettre à jour le stock dans le store Redux pour un affichage instantané
          dispatch(updateStockLocally({ productId: item.product_id, newStock }));
        }
      }

      // Ajouter à la queue de synchronisation
      await syncService.addToSyncQueue('sales', saleId, 'create', saleData);
      
      // Synchroniser immédiatement si en ligne
      if (isConnected) {
        try {
          setSyncStatus('syncing');
          await syncService.startSync();
          setSyncStatus('synced');
          console.log('✅ Vente synchronisée immédiatement');
        } catch (error) {
          setSyncStatus('pending');
          console.log('⚠️ Erreur synchronisation immédiate, sera retentée plus tard');
        }
      } else {
        setSyncStatus('pending');
      }

      // Rafraîchir les produits pour mettre à jour le stock
      await dispatch(fetchProducts());
      
      Alert.alert(
        'Vente Réussie! 🎉',
        `Vente #${saleId}\nTotal: ${getCartTotal().toLocaleString()} FCFA`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setSelectedCustomer(null);
            },
          },
        ]
      );

    } catch (error) {
      console.error('Erreur traitement vente:', error);
      Alert.alert('Erreur', 'Impossible de traiter la vente');
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item: product }: { item: any }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => addToCart(product)}
      activeOpacity={0.7}
    >
      {/* Image du produit */}
      <View style={styles.productImageContainer}>
        <Text style={styles.productImage}>📦</Text>
      </View>
      
      {/* Informations essentielles */}
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>
          {product.price_sell.toLocaleString()} FCFA
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      {/* Image et nom du produit */}
      <View style={styles.cartItemLeft}>
        <View style={styles.cartItemImage}>
          <Text style={styles.cartItemImageText}>📦</Text>
        </View>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cartItemPrice}>
            {item.price.toLocaleString()} FCFA
          </Text>
        </View>
      </View>
      
      {/* Contrôles de quantité */}
      <View style={styles.cartItemRight}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartQuantity(item.product_id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartQuantity(item.product_id, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Total et suppression */}
        <View style={styles.cartItemActions}>
          <Text style={styles.cartItemTotal}>
            {item.total.toLocaleString()} FCFA
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.product_id)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const createCustomer = async () => {
    try {
      if (!newCustomer.name.trim()) {
        Alert.alert('Erreur', 'Le nom du client est requis');
        return;
      }

      setLoading(true);

      // Créer le client localement
      const customerData = {
        ...newCustomer,
        created_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      const customerId = await databaseService.insert('customers', customerData);
      console.log(`✅ Client créé localement: ${customerId}`);

      // Ajouter à la queue de synchronisation
      await syncService.addToSyncQueue('customers', customerId, 'create', customerData);

      // Synchroniser immédiatement si en ligne
      if (isConnected) {
        try {
          await syncService.startSync();
          console.log('✅ Client synchronisé immédiatement');
        } catch (error) {
          console.log('⚠️ Erreur synchronisation immédiate, sera retentée plus tard');
        }
      }

      // Recharger les clients
      await loadData();

      // Réinitialiser le formulaire
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type: 'retail',
        credit_limit: 0,
        credit_balance: 0,
      });

      setShowAddCustomerModal(false);
      Alert.alert('Succès', 'Client créé avec succès ! 🎉');
    } catch (error) {
      console.error('Erreur création client:', error);
      Alert.alert('Erreur', 'Impossible de créer le client');
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (customerId: string, customerName: string) => {
    Alert.alert(
      'Supprimer le client',
      `Êtes-vous sûr de vouloir supprimer le client "${customerName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Récupérer les données du client avant suppression pour la sync
              const customerData = await databaseService.getById('customers', customerId);
              
              // Ajouter à la queue de synchronisation pour suppression en ligne
              if (customerData) {
                await syncService.addToSyncQueue('customers', customerId, 'delete', customerData);
                console.log(`🗑️ Client "${customerName}" ajouté à la queue de suppression`);
                
                // Marquer le client comme "à supprimer" au lieu de le supprimer immédiatement
                await databaseService.update('customers', customerId, {
                  sync_status: 'pending',
                  to_delete: true
                });
              }
              
              // Si un client sélectionné est supprimé, le désélectionner
              if (selectedCustomer?.id === customerId) {
                setSelectedCustomer(null);
              }
              
              // Recharger la liste des clients
              await loadData();
              
              Alert.alert('Succès', 'Client supprimé avec succès ! 🗑️');
            } catch (error) {
              console.error('Erreur suppression client:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le client');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderCustomer = ({ item: customer }: { item: Customer }) => (
    <View style={styles.customerCardContainer}>
      <TouchableOpacity
        style={[
          styles.customerCard,
          selectedCustomer?.id === customer.id && styles.customerCardSelected,
        ]}
        onPress={() => {
          setSelectedCustomer(customer);
          setShowCustomers(false);
        }}
      >
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerType}>
            {customer.customer_type === 'wholesale' ? 'Gros' : 'Détail'}
          </Text>
          {customer.phone && (
            <Text style={styles.customerPhone}>{customer.phone}</Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteCustomerButton}
        onPress={() => deleteCustomer(customer.id, customer.name)}
        disabled={loading}
      >
        <Ionicons name="trash-outline" size={dynamicSizes.button.size} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du POS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Point de Vente</Text>
            {/* Indicateur de synchronisation */}
            <View style={styles.syncIndicator}>
              <View style={[
                styles.syncDot, 
                { backgroundColor: syncStatus === 'synced' ? '#34C759' : syncStatus === 'syncing' ? '#FF9500' : '#FF3B30' }
              ]} />
              <Text style={styles.syncText}>
                {syncStatus === 'synced' ? 'Synchronisé' : 
                 syncStatus === 'syncing' ? 'Synchronisation...' : 
                 'En attente de sync'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => setShowSearchBar(!showSearchBar)}
            >
              <Ionicons name="search-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => setShowQRScanner(true)}
            >
              <Ionicons name="barcode-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Barre de recherche - affichée conditionnellement */}
      {showSearchBar && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Masquer la barre de recherche si le texte est vide
              if (text === '') {
                setShowSearchBar(false);
              }
            }}
            placeholderTextColor="#999"
            autoFocus={true}
          />
        </View>
      )}

      <View style={styles.content}>
        {/* Panier */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>
              Panier ({getCartItemsCount()})
            </Text>
            {cart.length > 0 && (
              <TouchableOpacity
                style={styles.clearCartButton}
                onPress={() => setCart([])}
              >
                <Text style={styles.clearCartText}>Vider</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyCartText}>Panier vide</Text>
              <Text style={styles.emptyCartSubtext}>
                Sélectionnez des produits pour commencer la vente
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  {/* Informations du produit */}
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>
                  
                  {/* Contrôles de quantité et prix */}
                  <View style={styles.quantitySection}>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={dynamicSizes.button.size * 0.5} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={dynamicSizes.button.size * 0.5} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartItemPrice}>
                      {item.total.toLocaleString()} FCFA
                    </Text>
                  </View>
                  
                  {/* Suppression */}
                  <View style={styles.cartItemActions}>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.product_id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Total et Actions */}
          {cart.length > 0 && (
            <View style={styles.cartFooter}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>{getCartTotal().toLocaleString()} FCFA</Text>
              </View>
              
              <TouchableOpacity
                style={styles.customerButton}
                onPress={() => setShowCustomers(!showCustomers)}
              >
                <Text style={styles.customerButtonText}>
                  👤 {selectedCustomer ? selectedCustomer.name : 'Sélectionner Client'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={processSale}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={dynamicSizes.fontSize.large} color="#fff" />
                    <Text style={styles.checkoutButtonText}>
                      ENCAISSER {getCartTotal().toLocaleString()} FCFA
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Liste des Clients */}
        {showCustomers && (
          <View style={styles.customersSection}>
            <View style={styles.customersSectionHeader}>
              <View style={styles.customersHeaderLeft}>
                <Text style={styles.customersTitle}>Clients</Text>
                {customers.length > 1 && (
                  <TouchableOpacity
                    style={styles.resetCustomersButtonSmall}
                    onPress={resetCustomers}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.addCustomerButton}
                onPress={() => setShowAddCustomerModal(true)}
              >
                <Ionicons name="add-circle" size={32} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customers}
              renderItem={renderCustomer}
              keyExtractor={(item) => item.id}
              style={styles.customersList}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={styles.noCustomerButton}
              onPress={() => {
                setSelectedCustomer(null);
                setShowCustomers(false);
              }}
            >
              <Text style={styles.noCustomerText}>👤 Client Anonyme</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Produits */}
        {!showCustomers && (
          <View style={styles.productsSection}>

            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              style={styles.productsList}
              contentContainerStyle={styles.productsListContent}
              showsVerticalScrollIndicator={false}
              numColumns={isLargeScreen ? 4 : isDesktop ? 3 : isTablet ? 3 : 2}
              columnWrapperStyle={isLargeScreen || isDesktop || isTablet ? styles.productRow : undefined}
              key={isLargeScreen ? 4 : isDesktop ? 3 : isTablet ? 3 : 2}
            />
          </View>
        )}
      </View>

      {/* Modal QR Scanner */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          title="Scanner QR Code"
          subtitle="Scannez un code QR pour ajouter un produit au panier"
        />
      </Modal>

      {/* Modal Ajout Client */}
      <Modal
        visible={showAddCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Client</Text>
              <TouchableOpacity
                onPress={() => setShowAddCustomerModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close-circle" size={32} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Nom */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Nom du client"
                  value={newCustomer.name}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
                />
              </View>

              {/* Téléphone */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Téléphone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="+223 XX XX XX XX"
                  value={newCustomer.phone}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="email@exemple.com"
                  value={newCustomer.email}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Adresse */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Adresse</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Adresse complète"
                  value={newCustomer.address}
                  onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Type de Client */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type de Client</Text>
                <View style={styles.customerTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.customerTypeButton,
                      newCustomer.customer_type === 'retail' && styles.customerTypeButtonActive
                    ]}
                    onPress={() => setNewCustomer({ ...newCustomer, customer_type: 'retail' })}
                  >
                    <Text style={[
                      styles.customerTypeButtonText,
                      newCustomer.customer_type === 'retail' && styles.customerTypeButtonTextActive
                    ]}>Détail</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.customerTypeButton,
                      newCustomer.customer_type === 'wholesale' && styles.customerTypeButtonActive
                    ]}
                    onPress={() => setNewCustomer({ ...newCustomer, customer_type: 'wholesale' })}
                  >
                    <Text style={[
                      styles.customerTypeButtonText,
                      newCustomer.customer_type === 'wholesale' && styles.customerTypeButtonTextActive
                    ]}>Gros</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Boutons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddCustomerModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={createCustomer}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Créer Client</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
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
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: dynamicSizes.fontSize.xlarge + 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.xs,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: dynamicSizes.spacing.xs,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: dynamicSizes.spacing.xs,
  },
  syncText: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  cartSection: {
    width: isLargeScreen ? Math.min(width * 0.25, 350) : 
           isDesktop ? Math.min(width * 0.3, 320) : 
           isTablet ? Math.min(width * 0.35, 300) : 
           Math.min(width * 0.4, 300),
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    zIndex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: dynamicSizes.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cartTitle: {
    fontSize: dynamicSizes.fontSize.xlarge,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  clearCartButton: {
    paddingHorizontal: dynamicSizes.spacing.md,
    paddingVertical: dynamicSizes.spacing.xs,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  clearCartText: {
    color: '#fff',
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: dynamicSizes.spacing.xl,
  },
  emptyCartText: {
    fontSize: dynamicSizes.fontSize.xlarge,
    fontWeight: '600',
    color: '#666',
    marginBottom: dynamicSizes.spacing.sm,
  },
  emptyCartSubtext: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#999',
    textAlign: 'center',
  },
  cartList: {
    flex: 1,
    padding: dynamicSizes.spacing.lg,
    maxHeight: isTablet ? 500 : 400,
  },
  cartItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: dynamicSizes.spacing.sm,
    marginBottom: dynamicSizes.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: isTablet ? 60 : 50,
  },
  cartItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: dynamicSizes.spacing.md,
  },
  cartItemImageText: {
    fontSize: 20,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: dynamicSizes.spacing.md,
  },
  cartItemName: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.xs,
  },
  cartItemRight: {
    alignItems: 'center',
  },
  quantitySection: {
    alignItems: 'center',
    marginRight: dynamicSizes.spacing.md,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.xs,
  },
  cartItemPrice: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  quantityButton: {
    width: dynamicSizes.button.size,
    height: dynamicSizes.button.size,
    borderRadius: dynamicSizes.button.size / 2,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    marginHorizontal: dynamicSizes.spacing.xs,
    minWidth: dynamicSizes.button.size - 4,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  cartItemActions: {
    alignItems: 'center',
  },
  cartItemTotal: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: dynamicSizes.spacing.xs,
  },
  removeButton: {
    padding: dynamicSizes.spacing.xs,
  },
  cartFooter: {
    padding: dynamicSizes.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: dynamicSizes.spacing.sm,
  },
  totalLabel: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  customerButton: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: dynamicSizes.spacing.sm,
    marginBottom: dynamicSizes.spacing.sm,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  customerButtonText: {
    color: '#007AFF',
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkoutButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: 'bold',
    marginLeft: dynamicSizes.spacing.xs,
  },
  customersSection: {
    flex: 1,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  customersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addCustomerButton: {
    padding: 4,
  },
  resetCustomersButtonSmall: {
    padding: 6,
    backgroundColor: '#ffe0e0',
    borderRadius: 6,
  },
  customersList: {
    flex: 1,
    padding: 16,
  },
  customerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerCardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: '#666',
  },
  customerCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerInfo: {
    flex: 1,
  },
  deleteCustomerButton: {
    padding: dynamicSizes.spacing.sm,
    marginLeft: dynamicSizes.spacing.sm,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCustomerButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  noCustomerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  productsSection: {
    flex: 1,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: dynamicSizes.spacing.md,
    marginBottom: dynamicSizes.spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 120 : 100,
    flex: 1,
    marginHorizontal: dynamicSizes.spacing.xs,
  },
  productImageContainer: {
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.sm,
  },
  productImage: {
    fontSize: isTablet ? 28 : 24,
  },
  productDetails: {
    alignItems: 'center',
  },
  productName: {
    fontSize: dynamicSizes.fontSize.small,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: dynamicSizes.spacing.xs,
    lineHeight: dynamicSizes.fontSize.small + 3,
  },
  productPrice: {
    fontSize: dynamicSizes.fontSize.medium,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  
  // Styles Modal Ajout Client
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  customerTypeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  customerTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  customerTypeButtonTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
