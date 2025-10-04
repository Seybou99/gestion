import { router } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { CompleteSyncButton } from '../../components/CompleteSyncButton';
import { NetworkTestButton } from '../../components/NetworkTestButton';
import { SyncStatusIndicator } from '../../components/ui/SyncStatusIndicator';
import { ZohoButton } from '../../components/ui/ZohoButton';
import { ZohoCard } from '../../components/ui/ZohoCard';
import { databaseService } from '../../services/DatabaseService';
import { AppDispatch, RootState } from '../../store';
import { createProduct, fetchProducts, setSearchQuery, setSelectedCategory } from '../../store/slices/productSlice';

const { width } = Dimensions.get('window');

/**
 * Écran Articles - Gestion des Articles avec Redux et SQLite
 * 
 * Affiche la liste des articles depuis la base de données locale
 * avec synchronisation automatique et mode offline.
 */
interface NewProduct {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category_id: string;
  price_buy: number;
  price_sell: number;
  unit: string;
}

export default function ArticlesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { 
    products, 
    loading, 
    error, 
    offlineMode, 
    searchQuery, 
    selectedCategory 
  } = useSelector((state: RootState) => state.products);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category_id: '',
    price_buy: 0,
    price_sell: 0,
    unit: 'pcs',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingAdd, setLoadingAdd] = useState(false);

  // Charger les produits et catégories au démarrage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('⚡ Démarrage du chargement optimisé...');
    
    // Charger les catégories en parallèle (plus rapide)
    const loadCategories = async () => {
      try {
        const categoriesData = await databaseService.getAll('categories');
        setCategories([
          { id: 'all', name: 'Tous' },
          ...categoriesData
        ]);
      } catch (error) {
        console.error('Erreur chargement catégories:', error);
        setCategories([
          { id: 'all', name: 'Tous' },
          { id: 'cat1', name: 'Électronique' },
          { id: 'cat2', name: 'Vêtements' },
          { id: 'cat3', name: 'Alimentation' },
          { id: 'cat4', name: 'Maison' },
        ]);
      }
    };

    // Charger catégories et produits en parallèle
    await Promise.all([
      dispatch(fetchProducts()),
      loadCategories()
    ]);
    
    console.log('✅ Chargement optimisé terminé');
  };

  // Filtrer les produits selon la recherche et la catégorie
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (product: any) => {
    if ((product as any).stock_quantity === undefined) return '#8E8E93';
    if ((product as any).stock_quantity === 0) return '#FF3B30';
    if ((product as any).stock_quantity <= 5) return '#FF9500';
    return '#34C759';
  };

  const getStatusText = (product: any) => {
    if ((product as any).stock_quantity === undefined) return 'Non défini';
    if ((product as any).stock_quantity === 0) return 'Rupture';
    if ((product as any).stock_quantity <= 5) return 'Stock faible';
    return 'Disponible';
  };

  const getStatusBackgroundColor = (product: any) => {
    if ((product as any).stock_quantity === undefined) return '#F0F0F0';
    if ((product as any).stock_quantity === 0) return '#FFEBEB';
    if ((product as any).stock_quantity <= 5) return '#FFF4E6';
    return '#E8F5E8';
  };

  const getSyncStatusColor = (syncStatus: string) => {
    switch (syncStatus) {
      case 'synced': return '#34C759';
      case 'pending': return '#FF9500';
      case 'error': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const renderProduct = ({ item: product }: { item: any }) => (
    <ZohoCard
      style={styles.articleCard}
      onPress={() => handleProductPress(product.id)}
    >
      <View style={styles.articleHeader}>
        <Text style={styles.articleImage}>📦</Text>
        <View style={styles.articleInfo}>
          <Text style={styles.articleName}>{product.name}</Text>
          <Text style={styles.articleSku}>SKU: {product.sku}</Text>
        </View>
        <View style={styles.articlePrice}>
          <Text style={styles.priceText}>{product.price_sell} FCFA</Text>
        </View>
      </View>
      
      {product.description && (
        <Text style={styles.articleDescription}>{product.description}</Text>
      )}
      
      <View style={styles.articleFooter}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockLabel}>Stock:</Text>
          <Text style={styles.stockValue}>
            {product.stock_quantity || 0} {product.unit || 'pcs'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBackgroundColor(product) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(product) },
              ]}
            >
              {getStatusText(product)}
            </Text>
          </View>
          <View style={[
            styles.syncIndicator,
            { backgroundColor: getSyncStatusColor(product.sync_status) }
          ]} />
        </View>
      </View>
    </ZohoCard>
  );


  // Fonctions pour l'ajout de produits
  const handleAddProduct = async () => {
    console.log('🚀 [DEBUG] Début handleAddProduct');
    console.log('🚀 [DEBUG] Données du produit:', newProduct);
    
    // Validation des champs obligatoires
    if (!newProduct.name || !newProduct.sku || !newProduct.price_sell) {
      console.log('❌ [DEBUG] Validation échouée:', {
        name: newProduct.name,
        sku: newProduct.sku,
        price_sell: newProduct.price_sell
      });
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    console.log('✅ [DEBUG] Validation réussie');

    try {
      console.log('🔄 [DEBUG] Début setLoadingAdd(true)');
      setLoadingAdd(true);
      console.log('✅ [DEBUG] setLoadingAdd(true) terminé');
      
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        category_id: newProduct.category_id || null,
        price_buy: newProduct.price_buy,
        price_sell: newProduct.price_sell,
        margin: newProduct.price_sell - newProduct.price_buy,
        unit: newProduct.unit,
        images: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      console.log('📦 [DEBUG] ProductData préparé:', productData);

      // Utiliser Redux pour créer le produit (gère la sync automatiquement)
      console.log('🔄 [DEBUG] Début dispatch(createProduct)');
      const result = await dispatch(createProduct({
        name: newProduct.name,
        description: newProduct.description,
        sku: newProduct.sku,
        barcode: newProduct.barcode || undefined,
        category_id: newProduct.category_id || undefined,
        price_buy: newProduct.price_buy,
        price_sell: newProduct.price_sell,
        margin: newProduct.price_sell - newProduct.price_buy,
        unit: newProduct.unit,
        images: undefined,
        is_active: true,
      }));
      console.log('✅ [DEBUG] dispatch(createProduct) terminé:', result);

      // Recharger les produits pour voir les changements
      console.log('🔄 [DEBUG] Début dispatch(fetchProducts)');
      await dispatch(fetchProducts());
      console.log('✅ [DEBUG] dispatch(fetchProducts) terminé');
      
      // Réinitialiser le formulaire
      console.log('🔄 [DEBUG] Réinitialisation du formulaire');
      setNewProduct({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        category_id: '',
        price_buy: 0,
        price_sell: 0,
        unit: 'pcs',
      });
      
      console.log('🔄 [DEBUG] Fermeture du modal');
      setShowAddModal(false);
      console.log('✅ [DEBUG] Affichage du message de succès');
      Alert.alert('Succès', 'Produit ajouté avec succès !');
      
    } catch (error) {
      console.error('❌ [DEBUG] Erreur dans handleAddProduct:', error);
      console.error('❌ [DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      Alert.alert('Erreur', `Impossible d'ajouter le produit: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      console.log('🔄 [DEBUG] Début setLoadingAdd(false)');
      setLoadingAdd(false);
      console.log('✅ [DEBUG] setLoadingAdd(false) terminé');
      console.log('🏁 [DEBUG] Fin handleAddProduct');
    }
  };

  const generateSKU = () => {
    const sku = `SKU-${Date.now().toString().slice(-6)}`;
    setNewProduct({ ...newProduct, sku });
  };

  const handleProductPress = (productId: string) => {
    console.log('🖱️ [DEBUG] Navigation vers produit:', productId);
    router.push(`/articles/${productId}`);
  };

  const calculateMargin = () => {
    if (newProduct.price_buy > 0 && newProduct.price_sell > 0) {
      const margin = ((newProduct.price_sell - newProduct.price_buy) / newProduct.price_buy) * 100;
      return `${margin.toFixed(1)}%`;
    }
    return '0%';
  };

  const renderCategory = (category: any) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryButton,
        selectedCategory === category.id && styles.categoryButtonActive,
      ]}
      onPress={() => dispatch(setSelectedCategory(category.id))}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category.id && styles.categoryTextActive,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des articles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec recherche et indicateur de sync */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Articles</Text>
          <Text style={styles.subtitle}>Gérez votre inventaire</Text>
        </View>
            <SyncStatusIndicator />
            
            <NetworkTestButton style={styles.testButton} />
            <CompleteSyncButton style={styles.testButton} />
            
            <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Filtres par catégorie */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(renderCategory)}
        </ScrollView>
      </View>


      {/* Message d'erreur */}
      {error && (
        <ZohoCard style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <ZohoButton
            title="Réessayer"
            onPress={() => dispatch(fetchProducts())}
            size="small"
            variant="outline"
          />
        </ZohoCard>
      )}

      {/* Indicateur mode offline */}
      {offlineMode && (
        <ZohoCard style={styles.offlineContainer}>
          <Text style={styles.offlineText}>Mode hors ligne activé</Text>
        </ZohoCard>
      )}

      {/* Liste des articles */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        style={styles.articlesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.articlesContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
        refreshing={loading}
        onRefresh={() => dispatch(fetchProducts())}
      />

      {/* Bouton d'action flottant - Position corrigée */}
      <TouchableOpacity 
        style={[
          styles.fabButton,
          { bottom: 20 + insets.bottom }
        ]}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal d'ajout de produit */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouvel Article</Text>
                <TouchableOpacity
                  onPress={() => {
                    console.log('🖱️ [DEBUG] Bouton Ajouter cliqué');
                    console.log('🖱️ [DEBUG] loadingAdd:', loadingAdd);
                    console.log('🖱️ [DEBUG] newProduct:', newProduct);
                    handleAddProduct();
                  }}
                  style={styles.modalSaveButton}
                  disabled={loadingAdd}
                >
                  <Text style={styles.modalSaveText}>
                    {loadingAdd ? 'Ajout...' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <ZohoCard style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Informations de base</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom du produit *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: iPhone 15 Pro"
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Description du produit"
                  value={newProduct.description}
                  onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>SKU *</Text>
                  <View style={styles.inputWithButton}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="SKU-001"
                      value={newProduct.sku}
                      onChangeText={(text) => setNewProduct({ ...newProduct, sku: text })}
                    />
                    <TouchableOpacity
                      style={styles.generateButton}
                      onPress={generateSKU}
                    >
                      <Text style={styles.generateButtonText}>Auto</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Code-barres</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1234567890123"
                    value={newProduct.barcode}
                    onChangeText={(text) => setNewProduct({ ...newProduct, barcode: text })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Catégorie</Text>
                <View style={styles.categorySelector}>
                  {categories.filter(cat => cat.id !== 'all').map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        newProduct.category_id === category.id && styles.categoryChipSelected,
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, category_id: category.id })}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        newProduct.category_id === category.id && styles.categoryChipTextSelected,
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unité</Text>
                <View style={styles.unitSelector}>
                  {['pcs', 'kg', 'g', 'L', 'mL', 'm', 'cm'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitChip,
                        newProduct.unit === unit && styles.unitChipSelected,
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, unit })}
                    >
                      <Text style={[
                        styles.unitChipText,
                        newProduct.unit === unit && styles.unitChipTextSelected,
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ZohoCard>

            <ZohoCard style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Prix et marges</Text>
              
              <View style={styles.priceRow}>
                <View style={styles.priceGroup}>
                  <Text style={styles.inputLabel}>Prix d'achat (FCFA)</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={newProduct.price_buy.toString()}
                    onChangeText={(text) => setNewProduct({ ...newProduct, price_buy: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.priceGroup}>
                  <Text style={styles.inputLabel}>Prix de vente (FCFA) *</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={newProduct.price_sell.toString()}
                    onChangeText={(text) => setNewProduct({ ...newProduct, price_sell: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.marginDisplay}>
                <Text style={styles.marginLabel}>Marge bénéficiaire:</Text>
                <Text style={styles.marginValue}>{calculateMargin()}</Text>
              </View>
            </ZohoCard>
          </ScrollView>
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
  titleContainer: {
    marginBottom: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
      testButton: {
        marginVertical: 8,
      },
  categoriesContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingRight: 20,
    alignItems: 'center',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFEBEB',
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 12,
  },
  offlineContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#FFF4E6',
    borderColor: '#FF9500',
    borderWidth: 1,
  },
  offlineText: {
    color: '#FF9500',
    fontSize: 14,
    textAlign: 'center',
  },
  articlesList: {
    flex: 1,
    marginTop: 20,
  },
  articlesContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  articleCard: {
    marginBottom: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  articleImage: {
    fontSize: 32,
    marginRight: 12,
  },
  articleInfo: {
    flex: 1,
  },
  articleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  articleSku: {
    fontSize: 12,
    color: '#666',
  },
  articlePrice: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  stockValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  // Styles pour le modal
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
  formCard: {
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unitChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unitChipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  unitChipTextSelected: {
    color: '#fff',
  },
  marginDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 8,
  },
  marginLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  marginValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  // Styles pour l'alignement des prix
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  priceInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
    fontWeight: '600',
  },
});