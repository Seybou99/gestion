import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ZohoCard } from '../../components/ui/ZohoCard';
import { AppDispatch, RootState } from '../../store';
import { Category, createCategory, deleteCategory, fetchCategories, updateCategory } from '../../store/slices/categorySlice';
import { syncCategoriesToLocal } from '../../utils/syncFirebaseToLocal';
import { getCurrentUser } from '../../utils/userInfo';

export default function CategoriesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  
  const { categories, loading, error } = useSelector((state: RootState) => state.categories);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingSyncFirebase, setLoadingSyncFirebase] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#007AFF',
    icon: '📂',
  });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de catégorie');
      return;
    }

    try {
      setLoadingAdd(true);
      
      await dispatch(createCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        color: newCategory.color,
        icon: newCategory.icon,
        is_active: true,
      }));
      
      // Réinitialiser le formulaire
      setNewCategory({
        name: '',
        description: '',
        color: '#007AFF',
        icon: '📂',
      });
      
      setShowAddModal(false);
      Alert.alert('Succès', 'Catégorie ajoutée avec succès !');
      
    } catch (error) {
      Alert.alert('Erreur', `Impossible d'ajouter la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de catégorie');
      return;
    }

    try {
      await dispatch(updateCategory({
        id: editingCategory.id,
        updates: {
          name: editingCategory.name.trim(),
          description: editingCategory.description?.trim(),
          color: editingCategory.color,
          icon: editingCategory.icon,
        }
      }));
      
      setShowEditModal(false);
      setEditingCategory(null);
      Alert.alert('Succès', 'Catégorie modifiée avec succès !');
      
    } catch (error) {
      Alert.alert('Erreur', `Impossible de modifier la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
          onPress: () => confirmDelete(category)
        }
      ]
    );
  };

  const confirmDelete = async (category: Category) => {
    setLoadingDelete(true);
    
    try {
      await dispatch(deleteCategory(category.id));
      Alert.alert('Succès', `Catégorie "${category.name}" supprimée avec succès`);
    } catch (error) {
      Alert.alert('Erreur', `Impossible de supprimer la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoadingDelete(false);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory({ ...category });
    setShowEditModal(true);
  };

  const handleSyncFromFirebase = async () => {
    try {
      setLoadingSyncFirebase(true);
      
      // Synchroniser les catégories depuis Firebase
      const result = await syncCategoriesToLocal();
      
      // Recharger les catégories dans le store Redux
      await dispatch(fetchCategories());
      
      // Afficher le résultat
      Alert.alert(
        'Synchronisation réussie !', 
        `✅ ${result.categoriesAdded} catégories ajoutées\n🔄 ${result.categoriesUpdated} catégories mises à jour\n⏭️ ${result.categoriesSkipped} catégories ignorées\n📊 Total Firebase: ${result.totalCategories}`
      );
    } catch (error) {
      console.error('❌ Erreur synchronisation Firebase:', error);
      Alert.alert(
        'Erreur de synchronisation', 
        error instanceof Error ? error.message : 'Impossible de synchroniser avec Firebase'
      );
    } finally {
      setLoadingSyncFirebase(false);
    }
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <ZohoCard style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
          <Text style={styles.categoryIconText}>{item.icon}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.categoryDescription}>{item.description}</Text>
          )}
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteCategory(item)}
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
    </ZohoCard>
  );

  const shouldShowLoading = loading && categories.length === 0;

  if (shouldShowLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des catégories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Catégories</Text>
          <Text style={styles.subtitle}>Gérez vos catégories</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.syncButton, loadingSyncFirebase && styles.syncButtonDisabled]}
            onPress={handleSyncFromFirebase}
            disabled={loadingSyncFirebase}
          >
            <Ionicons 
              name={loadingSyncFirebase ? "hourglass-outline" : "cloud-download-outline"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des catégories */}
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        style={styles.categoriesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.categoriesContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
        refreshing={loading}
        onRefresh={() => dispatch(fetchCategories())}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune catégorie trouvée</Text>
            <Text style={styles.emptySubtext}>Commencez par ajouter votre première catégorie</Text>
          </View>
        )}
      />

      {/* Modal d'ajout */}
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
            <Text style={styles.modalTitle}>Nouvelle Catégorie</Text>
            <TouchableOpacity
              onPress={handleAddCategory}
              style={styles.modalSaveButton}
              disabled={loadingAdd}
            >
              <Text style={styles.modalSaveText}>
                {loadingAdd ? 'Ajout...' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom de la catégorie *</Text>
              <TextInput
                style={styles.textInput}
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
                placeholder="Ex: Électronique, Vêtements..."
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newCategory.description}
                onChangeText={(text) => setNewCategory({ ...newCategory, description: text })}
                placeholder="Description optionnelle..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Icône</Text>
              <TextInput
                style={styles.textInput}
                value={newCategory.icon}
                onChangeText={(text) => setNewCategory({ ...newCategory, icon: text })}
                placeholder="📂"
                maxLength={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Couleur</Text>
              <TextInput
                style={styles.textInput}
                value={newCategory.color}
                onChangeText={(text) => setNewCategory({ ...newCategory, color: text })}
                placeholder="#007AFF"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier Catégorie</Text>
            <TouchableOpacity
              onPress={handleEditCategory}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {editingCategory && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom de la catégorie *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editingCategory.name}
                    onChangeText={(text) => setEditingCategory({ ...editingCategory, name: text })}
                    placeholder="Ex: Électronique, Vêtements..."
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={editingCategory.description || ''}
                    onChangeText={(text) => setEditingCategory({ ...editingCategory, description: text })}
                    placeholder="Description optionnelle..."
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Icône</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editingCategory.icon || '📂'}
                    onChangeText={(text) => setEditingCategory({ ...editingCategory, icon: text })}
                    placeholder="📂"
                    maxLength={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Couleur</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editingCategory.color || '#007AFF'}
                    onChangeText={(text) => setEditingCategory({ ...editingCategory, color: text })}
                    placeholder="#007AFF"
                  />
                </View>
              </>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#A8A8A8',
    opacity: 0.6,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  categoriesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categoriesContent: {
    paddingTop: 20,
  },
  categoryCard: {
    marginBottom: 12,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
