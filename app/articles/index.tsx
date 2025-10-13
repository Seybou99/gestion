import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { QRScanner } from '../../components/QRScanner';
import { ZohoButton } from '../../components/ui/ZohoButton';
import { ZohoCard } from '../../components/ui/ZohoCard';
import { databaseService } from '../../services/DatabaseService';
import { AppDispatch, RootState } from '../../store';
import { Category, createCategory, deleteCategory, fetchCategories, updateCategory } from '../../store/slices/categorySlice';
import { createProduct, fetchProducts, forceStopLoading, setSearchQuery, setSelectedCategory } from '../../store/slices/productSlice';
import { checkProductExists, cleanDuplicateProducts, syncFirebaseToLocalSafe } from '../../utils/duplicatePrevention';

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
    size: Math.max(40, width * 0.1),
    padding: Math.max(8, width * 0.02),
  }
};

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
  stock_quantity: number;
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
  const { isConnected = true } = useSelector((state: RootState) => state.network);
  // Utiliser le store Redux des catégories au lieu de l'état local
  const { categories: reduxCategories } = useSelector((state: RootState) => state.categories);


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
    stock_quantity: 0,
  });
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // États pour le modal des catégories
  const [modalCategories, setModalCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#007AFF',
  });

  // Couleurs prédéfinies pour les catégories
  const predefinedColors = [
    '#007AFF', // Bleu
    '#34C759', // Vert
    '#FF9500', // Orange
    '#FF3B30', // Rouge
    '#AF52DE', // Violet
    '#FF2D92', // Rose
    '#5AC8FA', // Bleu clair
    '#FFCC00', // Jaune
    '#8E8E93', // Gris
    '#FF6B35', // Rouge-orange
  ];


  // Créer la liste des catégories avec "Tous" en premier
  const categories = [
    { id: 'all', name: 'Tous' },
    ...reduxCategories
  ];

  // Charger les produits et catégories au démarrage
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Charger les catégories quand le modal s'ouvre
  useEffect(() => {
    if (showCategoriesModal) {
      loadModalCategories();
    }
  }, [showCategoriesModal]);

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
            {product.quantity_current || product.stock_quantity || 0} {product.unit || 'pcs'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
        <View
          style={[
            styles.productStatusBadge,
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
    // Validation des champs obligatoires
    if (!newProduct.name || !newProduct.sku || !newProduct.price_sell || newProduct.stock_quantity < 0) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires et une quantité de stock valide');
      return;
    }

    try {
      setLoadingAdd(true);
      
      // Vérifier les doublons avant création
      const duplicateCheck = await checkProductExists({
        sku: newProduct.sku,
        name: newProduct.name,
        barcode: newProduct.barcode
      });
      
      if (duplicateCheck.exists) {
        Alert.alert(
          'Produit déjà existant',
          `Un produit avec ce ${duplicateCheck.reason?.toLowerCase()} existe déjà : "${duplicateCheck.existingProduct?.name}"`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Créer quand même', 
              onPress: async () => {
                await createProductAction();
              }
            }
          ]
        );
        return;
      }
      
      await createProductAction();
      
    } catch (error) {
      console.error('Erreur handleAddProduct:', error);
      Alert.alert('Erreur', 'Impossible de créer le produit');
    } finally {
      setLoadingAdd(false);
    }
  };

  const createProductAction = async () => {
    try {
      // Utiliser Redux pour créer le produit (gère la sync automatiquement)
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
        stock_quantity: newProduct.stock_quantity, // Passer la quantité de stock
      }));
        
      // Réinitialiser le formulaire
      setNewProduct({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        category_id: '',
        price_buy: 0,
        price_sell: 0,
        unit: 'pcs',
        stock_quantity: 0,
      });
      
      setShowAddModal(false);
      Alert.alert('Succès', 'Produit ajouté avec succès !');
      
    } catch (error) {
      Alert.alert('Erreur', `Impossible d'ajouter le produit: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const generateSKU = () => {
    const sku = `SKU-${Date.now().toString().slice(-6)}`;
    setNewProduct({ ...newProduct, sku });
  };

  const handleProductPress = (productId: string) => {
    router.push(`/articles/${productId}`);
  };

  const calculateMargin = () => {
    if (newProduct.price_buy > 0 && newProduct.price_sell > 0) {
      const margin = ((newProduct.price_sell - newProduct.price_buy) / newProduct.price_buy) * 100;
      return `${margin.toFixed(1)}%`;
    }
    return '0%';
  };

  const getStockStatus = () => {
    if (newProduct.stock_quantity === 0) return { text: 'Rupture de stock', color: '#FF3B30' };
    if (newProduct.stock_quantity <= 10) return { text: 'Stock faible', color: '#FF9500' };
    return { text: 'Stock disponible', color: '#34C759' };
  };


  // ===== FONCTIONS POUR LA GESTION DES CATÉGORIES =====

  const loadModalCategories = async () => {
    try {
      setLoadingCategories(true);
      await dispatch(fetchCategories());
      const categoriesData = await databaseService.getAll('categories') as Category[];
      setModalCategories(categoriesData);
    } catch (error) {
      console.error('Erreur chargement catégories modal:', error);
      setModalCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de catégorie');
      return;
    }

    try {
      setLoadingCategories(true);
      
      await dispatch(createCategory({
        name: newCategory.name.trim(),
        description: '',
        color: newCategory.color,
        icon: '📂',
        is_active: true,
      }));
      
      // Réinitialiser le formulaire
      setNewCategory({
        name: '',
        color: '#007AFF',
      });
      
      setShowAddCategoryModal(false);
      await loadModalCategories(); // Recharger les catégories du modal
      // Les catégories sont automatiquement mises à jour depuis Redux
      Alert.alert('Succès', 'Catégorie ajoutée avec succès !');
      // Revenir au modal principal des catégories
      setTimeout(() => {
        setShowCategoriesModal(true);
      }, 100);
      
    } catch (error) {
      Alert.alert('Erreur', `Impossible d'ajouter la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de catégorie');
      return;
    }

    try {
      setLoadingCategories(true);
      
      await dispatch(updateCategory({
        id: editingCategory.id,
        updates: {
          name: editingCategory.name.trim(),
          description: editingCategory.description?.trim(),
          color: editingCategory.color,
          icon: editingCategory.icon,
        }
      }));
      
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      await loadModalCategories(); // Recharger les catégories
      Alert.alert('Succès', 'Catégorie modifiée avec succès !');
      
    } catch (error) {
      Alert.alert('Erreur', `Impossible de modifier la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?\n\nCette action supprimera la catégorie de votre appareil ET de Firebase.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => confirmDeleteCategory(category)
        }
      ]
    );
  };

  const confirmDeleteCategory = async (category: Category) => {
    try {
      setLoadingCategories(true);
      
      await dispatch(deleteCategory(category.id));
      await loadModalCategories(); // Recharger les catégories du modal
      // Les catégories sont automatiquement mises à jour depuis Redux
      Alert.alert('Succès', `Catégorie "${category.name}" supprimée avec succès`);
    } catch (error) {
      Alert.alert('Erreur', `Impossible de supprimer la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoadingCategories(false);
    }
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory({ 
      ...category,
      // S'assurer que la couleur existe dans nos couleurs prédéfinies
      color: predefinedColors.includes(category.color || '') ? category.color : '#007AFF'
    });
    setShowEditCategoryModal(true);
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

  // Fonction pour synchroniser Firebase → Local (sans doublons)
  const handleSyncFromFirebase = async () => {
    try {
      Alert.alert(
        'Synchronisation Complète',
        'Que voulez-vous faire ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Nettoyer Doublons',
            onPress: async () => {
              try {
                const result = await cleanDuplicateProducts();
                await dispatch(fetchProducts());
                Alert.alert(
                  'Nettoyage Terminé ! 🧹',
                  `${result.duplicatesFound} doublons trouvés\n${result.duplicatesRemoved} doublons supprimés`
                );
              } catch (error) {
                console.error('Erreur nettoyage doublons:', error);
                Alert.alert('Erreur', 'Impossible de nettoyer les doublons');
              }
            },
          },
          {
            text: 'Télécharger Firebase',
            onPress: async () => {
              try {
                const result = await syncFirebaseToLocalSafe();
                await dispatch(fetchProducts());
                Alert.alert(
                  'Synchronisation Terminée ! 🎉',
                  `${result.productsDownloaded} nouveaux produits téléchargés\n${result.stocksDownloaded} nouveaux stocks téléchargés\n${result.duplicatesSkipped} doublons évités\n\nTotal: ${result.totalProducts} produits, ${result.totalStocks} stocks`
                );
              } catch (error) {
                console.error('Erreur sync Firebase → Local:', error);
                Alert.alert('Erreur', 'Impossible de télécharger depuis Firebase');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erreur handleSyncFromFirebase:', error);
    }
  };

  // Fonction pour gérer le scan QR
  const handleQRScan = (data: string) => {
    console.log('🔍 QR Code scanné:', data);
    
    // Fermer le scanner
    setShowQRScanner(false);
    
    // Analyser le contenu du QR Code
    try {
      let productData;
      
      // Gérer le double encodage JSON si nécessaire
      try {
        productData = JSON.parse(data);
        // Si c'est encore une chaîne JSON, parser une deuxième fois
        if (typeof productData === 'string') {
          productData = JSON.parse(productData);
        }
      } catch {
        // Si ce n'est pas du JSON, traiter comme un simple code-barres
        productData = { barcode: data };
      }
      
      if (productData.name && productData.price) {
        // Pré-remplir le formulaire avec les données du QR Code
        setNewProduct({
          ...newProduct,
          name: productData.name,
          price_sell: productData.price,
          description: productData.description || '',
          sku: productData.sku || '',
          barcode: productData.barcode || data,
        });
        
        Alert.alert(
          'Produit détecté',
          `Nom: ${productData.name}\nPrix: ${productData.price} FCFA`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ajouter', onPress: () => setShowAddModal(true) }
          ]
        );
      }
    } catch (error) {
      // Si ce n'est pas un JSON, traiter comme un simple texte
      Alert.alert(
        'Code scanné',
        `Contenu: ${data}`,
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Utiliser comme nom', 
            onPress: () => {
              setNewProduct({ ...newProduct, name: data });
              setShowAddModal(true);
            }
          }
        ]
      );
    }
  };

  const shouldShowLoading = loading && products.length === 0 && !loadingAdd && !offlineMode;
  
  // Timeout pour éviter que le spinner reste figé
  useEffect(() => {
    if (shouldShowLoading) {
      const timeout = setTimeout(() => {
        // Forcer le rechargement des produits si le spinner reste figé
        dispatch(fetchProducts());
      }, 3000); // 3 secondes max
      
      return () => clearTimeout(timeout);
    }
  }, [shouldShowLoading, dispatch]);

  // Gestion supplémentaire : s'assurer que loading se remet à false
  useEffect(() => {
    if (loading && products.length > 0) {
      // Si on a des produits mais loading est encore true, forcer le reset
      const timeout = setTimeout(() => {
        dispatch(forceStopLoading());
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading, products.length, dispatch]);


  if (shouldShowLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" animating={true} />
        <Text style={styles.loadingText}>Chargement des articles...</Text>
        <Text style={styles.loadingSubtext}>Veuillez patienter...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec titre et icônes d'action */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
        <Text style={styles.title}>Articles</Text>
            {/* Indicateur de statut de connexion */}
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: offlineMode ? '#FF9500' : (isConnected ? '#34C759' : '#FF9500') }]} />
              <Text style={styles.statusText}>
                {offlineMode ? 'Hors ligne' : (isConnected ? 'En ligne' : 'Hors ligne')}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Icônes d'action */}
        <View style={styles.headerActions}>
          {/* Icône téléchargement Firebase (temporaire) */}
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={handleSyncFromFirebase}
          >
            <Ionicons name="cloud-download-outline" size={dynamicSizes.fontSize.large} color="#34C759" />
          </TouchableOpacity>
          
          {/* Icône scanner code-barres */}
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => {
              setShowQRScanner(true);
            }}
          >
            <Ionicons name="barcode-outline" size={dynamicSizes.fontSize.large} color="#007AFF" />
          </TouchableOpacity>
          
          {/* Icône recherche */}
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => {
              setShowSearchBar(!showSearchBar);
            }}
          >
            <Ionicons name="search-outline" size={dynamicSizes.fontSize.large} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

        
      {/* Barre de recherche - affichée conditionnellement */}
      {showSearchBar && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChangeText={(text) => {
              dispatch(setSearchQuery(text));
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

      {/* Filtres par catégorie */}
      <View style={styles.categoriesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
          {/* Bouton de gestion des catégories */}
          <TouchableOpacity
            style={styles.categoriesManagementButton}
            onPress={() => setShowCategoriesModal(true)}
          >
            <Text style={styles.categoriesManagementButtonText}>Catégories</Text>
          </TouchableOpacity>
          
          {/* Filtres de catégories */}
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

      {/* Indicateur mode offline - Bouton cliquable */}
      {offlineMode && (
        <TouchableOpacity 
          style={styles.offlineContainer}
          onPress={() => {
            // Basculer vers le mode online
            Alert.alert(
              'Activer le mode en ligne',
              'Voulez-vous activer le mode en ligne pour synchroniser vos données ?',
              [
                { text: 'Annuler', style: 'cancel' },
                { 
                  text: 'Activer', 
                  onPress: () => {
                    // TODO: Implémenter la logique pour activer le mode online
                    Alert.alert('Info', 'Fonctionnalité à implémenter');
                  }
                }
              ]
            );
          }}
        >
          <View style={styles.offlineContent}>
            <Ionicons name="cloud-offline-outline" size={20} color="#FF9500" />
            <Text style={styles.offlineText}>Mode hors ligne activé - Appuyez pour activer en ligne</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF9500" />
        </View>
        </TouchableOpacity>
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
        refreshing={false}
        onRefresh={offlineMode ? undefined : () => dispatch(fetchProducts())}
        numColumns={isLargeScreen ? 2 : 1}
        columnWrapperStyle={isLargeScreen ? styles.articleRow : undefined}
        key={isLargeScreen ? 2 : 1}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {offlineMode ? 'Aucun article en mode hors ligne' : 'Aucun article trouvé'}
          </Text>
            <Text style={styles.emptySubtext}>
              {offlineMode 
                ? 'Les articles sont chargés depuis le cache local' 
                : searchQuery 
                  ? 'Aucun résultat pour votre recherche' 
                  : 'Commencez par ajouter votre premier article'
              }
            </Text>
            {offlineMode && (
              <View style={styles.offlineHint}>
                <Ionicons name="cloud-offline-outline" size={16} color="#FF9500" />
                <Text style={styles.offlineHintText}>Mode hors ligne actif</Text>
        </View>
            )}
        </View>
        )}
      />

      {/* Bouton d'action flottant - Position corrigée */}
      <TouchableOpacity 
        style={[
          styles.fabButton,
          { bottom: 50 + insets.bottom }
        ]}
        onPress={() => {
          setShowAddModal(true);
          // Les catégories sont automatiquement disponibles depuis Redux
        }}
      >
        <Ionicons name="add" size={dynamicSizes.fontSize.xlarge} color="#fff" />
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
                  onPress={handleAddProduct}
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
                  <Text style={styles.inputLabel}>Prix de vente (FCFA)*</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={newProduct.price_sell.toString()}
                    onChangeText={(text) => setNewProduct({ ...newProduct, price_sell: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Champ Stock */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock initial *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Quantité en stock"
                  value={newProduct.stock_quantity.toString()}
                  onChangeText={(text) => setNewProduct({ ...newProduct, stock_quantity: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
                <Text style={[styles.stockStatus, { color: getStockStatus().color }]}>
                  {getStockStatus().text}
                </Text>
              </View>

              <View style={styles.marginDisplay}>
                <Text style={styles.marginLabel}>Marge bénéficiaire:</Text>
                <Text style={styles.marginValue}>{calculateMargin()}</Text>
              </View>
            </ZohoCard>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de gestion des catégories */}
      <Modal
        visible={showCategoriesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCategoriesModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Gestion des Catégories</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => {
                // Fermer le modal principal d'abord
                setShowCategoriesModal(false);
                // Attendre un court délai puis ouvrir le modal d'ajout
                setTimeout(() => {
                  setShowAddCategoryModal(true);
                }, 300);
              }}
            >
              <Text style={styles.modalSaveText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Chargement des catégories...</Text>
              </View>
            ) : (
      <FlatList
                data={modalCategories}
                renderItem={({ item }) => {
                  return (
                  <ZohoCard style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: item.color || '#007AFF' }]}>
                        <Text style={styles.categoryIconText}>{item.icon && item.icon.trim() !== '' ? item.icon : '📂'}</Text>
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.categoryDescription}>{item.description}</Text>
                        )}
                      </View>
                      <View style={styles.categoryActions}>
                        <TouchableOpacity
                          style={styles.categoryActionButton}
                          onPress={() => openEditCategoryModal(item)}
                        >
                          <Ionicons name="create-outline" size={24} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.categoryActionButton}
                          onPress={() => handleDeleteCategory(item)}
                          disabled={loadingCategories}
                        >
                          <Ionicons 
                            name={loadingCategories ? "hourglass-outline" : "trash-outline"} 
                            size={24} 
                            color="#000" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ZohoCard>
                  );
                }}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalCategoriesContent}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Aucune catégorie trouvée</Text>
                    <Text style={styles.emptySubtext}>Commencez par ajouter votre première catégorie</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal d'ajout de catégorie */}
      <Modal
        visible={showAddCategoryModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
      >
        <View style={styles.addCategoryModalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAddCategoryModal(false);
                // Revenir au modal principal des catégories
                setTimeout(() => {
                  setShowCategoriesModal(true);
                }, 100);
              }}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouvelle Catégorie</Text>
            <TouchableOpacity
              onPress={handleAddCategory}
              style={styles.modalSaveButton}
              disabled={loadingCategories}
            >
              <Text style={styles.modalSaveText}>
                {loadingCategories ? 'Ajout...' : 'Ajouter'}
              </Text>
      </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.categoryInputGroup}>
              <Text style={styles.categoryInputLabel}>Nom de la catégorie *</Text>
              <TextInput
                style={styles.categoryTextInput}
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
                placeholder="Ex: Électronique, Vêtements..."
                autoFocus
              />
            </View>

            <View style={styles.categoryInputGroup}>
              <Text style={styles.categoryInputLabel}>Couleur</Text>
              <View style={styles.colorPickerContainer}>
                {predefinedColors.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      newCategory.color === color && styles.colorCircleSelected,
                    ]}
                    onPress={() => setNewCategory({ ...newCategory, color })}
                  >
                    {newCategory.color === color && (
                      <View style={styles.colorCheckmark}>
                        <Text style={styles.colorCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal d'édition de catégorie */}
      <Modal
        visible={showEditCategoryModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowEditCategoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier Catégorie</Text>
            <TouchableOpacity
              onPress={handleEditCategory}
              style={styles.modalSaveButton}
              disabled={loadingCategories}
            >
              <Text style={styles.modalSaveText}>
                {loadingCategories ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {editingCategory && (
              <>
                <View style={styles.categoryInputGroup}>
                  <Text style={styles.categoryInputLabel}>Nom de la catégorie *</Text>
                  <TextInput
                    style={styles.categoryTextInput}
                    value={editingCategory.name}
                    onChangeText={(text) => setEditingCategory({ ...editingCategory, name: text })}
                    placeholder="Ex: Électronique, Vêtements..."
                  />
                </View>

                <View style={styles.categoryInputGroup}>
                  <Text style={styles.categoryInputLabel}>Couleur</Text>
                  <View style={styles.colorPickerContainer}>
                    {predefinedColors.map((color, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          editingCategory.color === color && styles.colorCircleSelected,
                        ]}
                        onPress={() => setEditingCategory({ ...editingCategory, color })}
                      >
                        {editingCategory.color === color && (
                          <View style={styles.colorCheckmark}>
                            <Text style={styles.colorCheckmarkText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

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
          subtitle="Scannez un code QR pour ajouter un produit"
        />
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
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  productStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: dynamicSizes.button.size,
    height: dynamicSizes.button.size,
    borderRadius: dynamicSizes.button.size / 2,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerIconText: {
    fontSize: dynamicSizes.fontSize.xlarge,
  },
  title: {
    fontSize: dynamicSizes.fontSize.xlarge + 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
  categoriesContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingRight: 20,
    alignItems: 'center',
  },
  categoriesManagementButton: {
    backgroundColor: '#06d6a0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoriesManagementButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
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
    borderRadius: 8,
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineText: {
    color: '#FF9500',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  articlesList: {
    flex: 1,
    marginTop: dynamicSizes.spacing.xl,
  },
  articlesContent: {
    paddingHorizontal: dynamicSizes.spacing.xl,
    paddingBottom: 100,
  },
  articleRow: {
    justifyContent: 'space-between',
    paddingHorizontal: dynamicSizes.spacing.xs,
  },
  articleCard: {
    marginBottom: dynamicSizes.spacing.md,
    flex: isLargeScreen ? 1 : undefined,
    marginHorizontal: isLargeScreen ? dynamicSizes.spacing.xs : 0,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: dynamicSizes.spacing.md,
  },
  articleImage: {
    fontSize: isTablet ? 36 : 32,
    marginRight: dynamicSizes.spacing.md,
  },
  articleInfo: {
    flex: 1,
  },
  articleName: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: dynamicSizes.spacing.xs,
  },
  articleSku: {
    fontSize: dynamicSizes.fontSize.small,
    color: '#666',
  },
  articlePrice: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: dynamicSizes.spacing.md,
    paddingVertical: dynamicSizes.spacing.xs,
    borderRadius: 8,
  },
  priceText: {
    fontSize: dynamicSizes.fontSize.large,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  articleDescription: {
    fontSize: dynamicSizes.fontSize.medium,
    color: '#666',
    lineHeight: dynamicSizes.fontSize.medium + 6,
    marginBottom: dynamicSizes.spacing.md,
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
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fabButton: {
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
  fabText: {
    fontSize: dynamicSizes.fontSize.xlarge + 2,
    color: '#fff',
    fontWeight: '300',
  },
  // Styles pour le modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  addCategoryModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    zIndex: 1000,
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
    fontSize: 15,
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
  stockStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'right',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  offlineHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  offlineHintText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
    marginLeft: 6,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // ===== STYLES POUR LA GESTION DES CATÉGORIES =====
  modalCategoriesContent: {
    padding: 16,
  },
  categoryCard: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 18,
    color: 'white',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInputGroup: {
    marginBottom: 20,
  },
  categoryInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  categoryTextInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1f2937',
  },
  categoryTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  colorCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginBottom: 12,
    marginHorizontal: 5,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  colorCircleSelected: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  colorCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheckmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});