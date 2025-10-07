import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ZohoButton } from '../../components/ui/ZohoButton';
import { databaseService } from '../../services/DatabaseService';
import { AppDispatch, RootState } from '../../store';
import { fetchProducts } from '../../store/slices/productSlice';

const { width } = Dimensions.get('window');

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
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await dispatch(fetchProducts());
      const customersData = await databaseService.getAll('customers');
      setCustomers(customersData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
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
      
      // Créer la vente
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        location_id: 'default_location',
        total_amount: getCartTotal(),
        tax_amount: getCartTotal() * 0.18, // TVA 18% au Mali
        discount_amount: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        sale_date: new Date().toISOString(),
        created_by: 'current_user',
        notes: `Vente POS - ${cart.length} articles`,
        sync_status: 'pending' as const,
      };

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
          const stockItem = stockItems[0];
          await databaseService.update('stock', stockItem.id, {
            quantity_current: stockItem.quantity_current - item.quantity,
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'out',
          });
        }
      }

      // Ajouter à la queue de synchronisation
      // await syncService.addToSyncQueue('sales', saleId, 'create', saleData);

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
    >
      <View style={styles.productHeader}>
        <Text style={styles.productImage}>📦</Text>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSku}>SKU: {product.sku}</Text>
        </View>
        <Text style={styles.productPrice}>{product.price_sell.toLocaleString()} FCFA</Text>
      </View>
      <Text style={styles.productDescription} numberOfLines={2}>
        {product.description || 'Aucune description'}
      </Text>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{item.price.toLocaleString()} FCFA</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartQuantity(item.product_id, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartQuantity(item.product_id, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.product_id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>{item.total.toLocaleString()} FCFA</Text>
    </View>
  );

  const renderCustomer = ({ item: customer }: { item: Customer }) => (
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
      <Text style={styles.customerName}>{customer.name}</Text>
      <Text style={styles.customerType}>
        {customer.customer_type === 'wholesale' ? 'Gros' : 'Détail'}
      </Text>
      {customer.phone && (
        <Text style={styles.customerPhone}>{customer.phone}</Text>
      )}
    </TouchableOpacity>
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
        <Text style={styles.title}>Point de Vente</Text>
        <Text style={styles.subtitle}>Interface de caisse moderne</Text>
      </View>

      <View style={styles.content}>
        {/* Panier */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>
              Panier ({getCartItemsCount()} articles)
            </Text>
            <TouchableOpacity
              style={styles.clearCartButton}
              onPress={() => setCart([])}
            >
              <Text style={styles.clearCartText}>Vider</Text>
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Panier vide</Text>
              <Text style={styles.emptyCartSubtext}>
                Ajoutez des produits pour commencer
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.cartList}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>{item.price.toLocaleString()} FCFA</Text>
                  </View>
                  <View style={styles.cartItemControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.product_id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>{item.total.toLocaleString()} FCFA</Text>
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

              <ZohoButton
                title="💳 Finaliser la Vente"
                onPress={processSale}
                variant="primary"
                style={styles.checkoutButton}
                loading={loading}
              />
            </View>
          )}
        </View>

        {/* Liste des Clients */}
        {showCustomers && (
          <View style={styles.customersSection}>
            <Text style={styles.customersTitle}>Sélectionner un Client</Text>
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

        {/* Recherche et Produits */}
        {!showCustomers && (
          <View style={styles.productsSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />

            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              style={styles.productsList}
              showsVerticalScrollIndicator={false}
              numColumns={2}
              key={2}
            />
          </View>
        )}
      </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  cartSection: {
    width: width * 0.4,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  clearCartButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  clearCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  cartList: {
    flex: 1,
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 16,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    minWidth: 80,
    textAlign: 'right',
  },
  cartFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  customerButton: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  customerButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkoutButton: {
    width: '100%',
  },
  customersSection: {
    width: width * 0.6,
    backgroundColor: '#fff',
  },
  customersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    width: width * 0.6,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  productCard: {
    width: (width * 0.6 - 48) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    fontSize: 24,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  productSku: {
    fontSize: 10,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
