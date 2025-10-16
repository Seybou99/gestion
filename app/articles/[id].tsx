import { Ionicons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker'; // Temporairement désactivé
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch } from 'react-redux';
import { ZohoCard } from '../../components/ui/ZohoCard';
import { databaseService } from '../../services/DatabaseService';
import { AppDispatch } from '../../store';
import { Category } from '../../store/slices/categorySlice';
import { deleteProduct, updateProduct } from '../../store/slices/productSlice';

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  category_id: string;
  price_buy: number;
  price_sell: number;
  margin: number;
  unit: string;
  images?: string[];
  is_active: boolean;
  sync_status: 'pending' | 'synced' | 'error';
  created_at: string;
  updated_at: string;
  quantity_current?: number;
  quantity_min?: number;
  quantity_max?: number;
  last_movement_date?: string;
  last_movement_type?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  description: string;
  color: string;
}

// Les catégories sont maintenant chargées depuis la base de données

const units = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'm²'];

export default function ArticleDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  // S'assurer que id est une string
  const productId = Array.isArray(id) ? id[0] : id;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  
  // État pour le formulaire d'édition
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [editProductImages, setEditProductImages] = useState<string[]>([]);
  
  // État pour les catégories
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    loadProduct();
    loadCategories();
  }, [id]);

  const loadProduct = async () => {
    try {
      console.log('🔍 [DETAILS] Chargement du produit:', productId);
      const products = await databaseService.getProductsWithStock();
      const foundProduct = products.find((p: any) => p.id === productId);
      
      if (foundProduct) {
        const typedProduct = foundProduct as Product;
        setProduct(typedProduct);
        setEditProduct({ ...typedProduct });
        setEditProductImages(typedProduct.images || []);
        console.log('✅ [DETAILS] Produit trouvé:', typedProduct.name);
      } else {
        console.log('❌ [DETAILS] Produit non trouvé');
        Alert.alert('Erreur', 'Produit non trouvé');
        router.replace('/articles');
      }
    } catch (error) {
      console.error('❌ [DETAILS] Erreur chargement produit:', error);
      Alert.alert('Erreur', 'Impossible de charger le produit');
      router.replace('/articles');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await databaseService.getAll('categories') as Category[];
      const formattedCategories: CategoryOption[] = categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        color: cat.color || '#007AFF'
      }));
      setAvailableCategories(formattedCategories);
    } catch (error) {
      console.error('❌ [DETAILS] Erreur chargement catégories:', error);
      setAvailableCategories([]);
    }
  };

  // Fonction pour sélectionner une image
  const pickImage = async () => {
    try {
      if (editProductImages.length >= 5) {
        Alert.alert('Limite atteinte', 'Vous pouvez ajouter un maximum de 5 images par produit');
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour ajouter des images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setEditProductImages([...editProductImages, base64Image]);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  // Fonction pour prendre une photo
  const takePhoto = async () => {
    try {
      if (editProductImages.length >= 5) {
        Alert.alert('Limite atteinte', 'Vous pouvez ajouter un maximum de 5 images par produit');
        return;
      }

      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la caméra pour prendre des photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setEditProductImages([...editProductImages, base64Image]);
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // Fonction pour supprimer une image
  const removeImage = (index: number) => {
    const newImages = editProductImages.filter((_, i) => i !== index);
    setEditProductImages(newImages);
  };

  const handleUpdateProduct = async () => {
    if (!product || !editProduct.name?.trim()) {
      Alert.alert('Erreur', 'Le nom du produit est obligatoire');
      return;
    }

    setLoadingEdit(true);
    
    try {
      console.log('🔄 [DETAILS] Mise à jour du produit:', editProduct);
      
      // Calculer la nouvelle marge
      const priceBuy = parseFloat(editProduct.price_buy?.toString() || '0');
      const priceSell = parseFloat(editProduct.price_sell?.toString() || '0');
      
      // Validation des prix
      if (isNaN(priceBuy) || isNaN(priceSell)) {
        Alert.alert('Erreur', 'Les prix doivent être des nombres valides');
        return;
      }
      
      if (priceBuy < 0 || priceSell < 0) {
        Alert.alert('Erreur', 'Les prix ne peuvent pas être négatifs');
        return;
      }
      
      const margin = priceBuy > 0 ? ((priceSell - priceBuy) / priceBuy) * 100 : 0;
      
      const updatedProduct = {
        ...editProduct,
        margin: Math.round(margin * 100) / 100,
        images: editProductImages.length > 0 ? editProductImages : undefined,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      // Mettre à jour via Redux (qui gère la sync)
      await dispatch(updateProduct({ 
        id: product.id, 
        productData: updatedProduct 
      }));

      // Recharger le produit
      await loadProduct();
      
      setShowEditModal(false);
      Alert.alert('Succès', 'Produit mis à jour avec succès');
      
    } catch (error) {
      console.error('❌ [DETAILS] Erreur mise à jour:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le produit');
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDeleteProduct = () => {
    if (!product) return;

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${product.name}" ?\n\nCette action supprimera le produit de votre appareil ET de Firebase.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: confirmDelete 
        }
      ]
    );
  };

  const confirmDelete = async () => {
    if (!product) return;

    setLoadingDelete(true);
    
    try {
      console.log('🗑️ [DETAILS] Suppression du produit:', product.name);
      
      // Supprimer via Redux (qui gère la sync)
      await dispatch(deleteProduct(product.id));
      
      Alert.alert(
        'Produit supprimé',
        `"${product.name}" a été supprimé avec succès`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/articles')
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ [DETAILS] Erreur suppression:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le produit');
    } finally {
      setLoadingDelete(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = availableCategories.find(c => c.id === categoryId);
    return category?.name || 'Catégorie inconnue';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = availableCategories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/articles')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/articles')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Produit non trouvé</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowEditModal(true)}
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDeleteProduct}
            style={styles.actionButton}
            disabled={loadingDelete}
          >
            <Ionicons 
              name={loadingDelete ? "hourglass-outline" : "trash-outline"} 
              size={24} 
              color="#000" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Images du produit */}
        {product.images && product.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.productImagesGallery}
            contentContainerStyle={styles.productImagesContent}
          >
            {product.images.map((imageUri, index) => (
              <RNImage
                key={index}
                source={{ uri: imageUri }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        <ZohoCard style={styles.card}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
          
          <View style={styles.categoryContainer}>
            <Text style={styles.label}>Catégorie</Text>
            <View style={[styles.categoryChip, { backgroundColor: getCategoryColor(product.category_id) }]}>
              <Text style={styles.categoryText}>{getCategoryName(product.category_id)}</Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.label}>SKU</Text>
              <Text style={styles.value}>{product.sku}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.label}>Code-barres</Text>
              <Text style={styles.value}>{product.barcode || 'Non défini'}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.label}>Unité</Text>
              <Text style={styles.value}>{product.unit}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.label}>Stock actuel</Text>
              <Text style={[styles.value, { color: (product.quantity_current || 0) === 0 ? '#EF4444' : (product.quantity_current || 0) <= 10 ? '#F59E0B' : '#10B981' }]}>
                {product.quantity_current || 0} {product.unit}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.label}>Statut</Text>
              <Text style={styles.value}>{product.is_active ? 'Actif' : 'Inactif'}</Text>
            </View>
          </View>

          <View style={styles.pricingContainer}>
            <Text style={styles.sectionTitle}>Prix et marges</Text>
            
            <View style={styles.pricingGrid}>
              <View style={styles.pricingItem}>
                <Text style={styles.label}>Prix d'achat</Text>
                <Text style={[styles.value, styles.priceValue]}>
                  {product.price_buy.toFixed(2)} FCFA
                </Text>
              </View>
              
              <View style={styles.pricingItem}>
                <Text style={styles.label}>Prix de vente</Text>
                <Text style={[styles.value, styles.priceValue]}>
                  {product.price_sell.toFixed(2)} FCFA
                </Text>
              </View>
              
              <View style={styles.pricingItem}>
                <Text style={styles.label}>Marge</Text>
                <Text style={[styles.value, styles.marginValue]}>
                  {product.margin != null ? product.margin.toFixed(2) : '0.00'}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.syncContainer}>
            <Text style={styles.label}>Statut de synchronisation</Text>
            <View style={[
              styles.syncStatus, 
              { backgroundColor: product.sync_status === 'synced' ? '#10B981' : 
                                 product.sync_status === 'pending' ? '#F59E0B' : '#EF4444' }
            ]}>
              <Text style={styles.syncStatusText}>
                {product.sync_status === 'synced' ? '✅ Synchronisé' :
                 product.sync_status === 'pending' ? '⏳ En attente' : '❌ Erreur'}
              </Text>
            </View>
          </View>
        </ZohoCard>
      </ScrollView>

      {/* Modal d'édition */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelButton}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier le produit</Text>
            <TouchableOpacity 
              onPress={handleUpdateProduct}
              disabled={loadingEdit}
            >
              <Text style={[styles.modalSaveButton, loadingEdit && styles.disabledButton]}>
                {loadingEdit ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Section Images */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Photos du produit</Text>
              
              {editProductImages.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagesGallery}
                >
                  {editProductImages.map((imageUri, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <RNImage 
                        source={{ uri: imageUri }} 
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={20} color="#007AFF" />
                  <Text style={styles.imageButtonText}>Galerie</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={20} color="#007AFF" />
                  <Text style={styles.imageButtonText}>Photo</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.imageHint}>
                💡 Maximum 5 photos par produit
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom du produit *</Text>
              <TextInput
                style={styles.formInput}
                value={editProduct.name || ''}
                onChangeText={(text) => setEditProduct({ ...editProduct, name: text })}
                placeholder="Nom du produit"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={editProduct.description || ''}
                onChangeText={(text) => setEditProduct({ ...editProduct, description: text })}
                placeholder="Description du produit"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>SKU</Text>
              <TextInput
                style={styles.formInput}
                value={editProduct.sku || ''}
                onChangeText={(text) => setEditProduct({ ...editProduct, sku: text })}
                placeholder="Code SKU"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Code-barres</Text>
              <TextInput
                style={styles.formInput}
                value={editProduct.barcode || ''}
                onChangeText={(text) => setEditProduct({ ...editProduct, barcode: text })}
                placeholder="Code-barres (optionnel)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Catégorie</Text>
              <View style={styles.categorySelector}>
                {availableCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      editProduct.category_id === category.id && styles.selectedCategory,
                      { borderColor: category.color }
                    ]}
                    onPress={() => setEditProduct({ ...editProduct, category_id: category.id })}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      editProduct.category_id === category.id && styles.selectedCategoryText
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Unité</Text>
              <View style={styles.unitSelector}>
                {units.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitChip,
                      editProduct.unit === unit && styles.selectedUnit
                    ]}
                    onPress={() => setEditProduct({ ...editProduct, unit })}
                  >
                    <Text style={[
                      styles.unitChipText,
                      editProduct.unit === unit && styles.selectedUnitText
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prix et marges</Text>
              <View style={styles.pricingInputs}>
                <View style={styles.pricingInput}>
                  <Text style={styles.pricingLabel}>Prix d'achat (FCFA)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editProduct.price_buy?.toString() || ''}
                    onChangeText={(text) => setEditProduct({ 
                      ...editProduct, 
                      price_buy: parseFloat(text) || 0 
                    })}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.pricingInput}>
                  <Text style={styles.pricingLabel}>Prix de vente (FCFA)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editProduct.price_sell?.toString() || ''}
                    onChangeText={(text) => setEditProduct({ 
                      ...editProduct, 
                      price_sell: parseFloat(text) || 0 
                    })}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 90,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 24,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  value: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  pricingContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  pricingItem: {
    flex: 1,
    minWidth: '30%',
  },
  priceValue: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '700',
  },
  marginValue: {
    color: '#D97706',
    fontSize: 18,
    fontWeight: '700',
  },
  syncContainer: {
    marginTop: 20,
  },
  syncStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  syncStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  selectedCategory: {
    backgroundColor: '#f3f4f6',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedCategoryText: {
    fontWeight: '600',
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectedUnit: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedUnitText: {
    color: '#fff',
  },
  pricingInputs: {
    gap: 12,
  },
  pricingInput: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  // Styles pour les images
  productImagesGallery: {
    marginBottom: 16,
  },
  productImagesContent: {
    paddingHorizontal: 16,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  imagesGallery: {
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  imageHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
