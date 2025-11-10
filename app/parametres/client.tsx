import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { networkService } from '../../services/NetworkService';
import { syncService } from '../../services/SyncService';
import { getCurrentUser } from '../../utils/userInfo';

const { width } = Dimensions.get('window');

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

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: 'retail' | 'wholesale';
  credit_limit: number;
  credit_balance: number;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
  sync_status?: 'synced' | 'pending' | 'error';
}

export default function ClientScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
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
    loadCustomers();
  }, []);

  // Recharger les clients quand l'écran reprend le focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 [CLIENT] Écran en focus, rechargement des clients');
      loadCustomers();
    });

    return unsubscribe;
  }, [navigation]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [CLIENT] Aucun utilisateur connecté');
        return;
      }

      console.log('📊 [CLIENT] Chargement des clients pour:', currentUser.email);
      console.log('👤 [CLIENT] UID utilisateur:', currentUser.uid);

      // CHARGER UNIQUEMENT DEPUIS LA BASE LOCALE
      // RealtimeSync gère automatiquement la synchronisation avec Firebase
      console.log('📱 [CLIENT] Chargement depuis la base locale uniquement...');
      let allCustomers = await databaseService.getAllByUser('customers', currentUser.uid) as any[];
      console.log(`📊 [CLIENT] Clients trouvés localement: ${allCustomers.length}`);
      
      // Filtrer par utilisateur (sécurité supplémentaire) et dédupliquer
      const userCustomers = allCustomers.filter((customer: any) => 
        customer.created_by === currentUser.uid
      );
      
      console.log('🔍 [CLIENT] Clients après filtrage utilisateur:', userCustomers.length);
      
      // Dédupliquer par firebase_id ou id (éviter les doublons créés par RealtimeSync)
      const uniqueCustomersMap = new Map<string, any>();
      
      userCustomers.forEach((customer: any) => {
        // Utiliser firebase_id comme clé principale, sinon id local
        const key = customer.firebase_id || customer.id;
        
        // Si on a déjà un client avec ce firebase_id, garder celui avec le plus d'informations
        if (uniqueCustomersMap.has(key)) {
          const existing = uniqueCustomersMap.get(key)!;
          // Garder celui qui a le firebase_id si l'autre ne l'a pas
          if (customer.firebase_id && !existing.firebase_id) {
            uniqueCustomersMap.set(key, customer);
          }
        } else {
          uniqueCustomersMap.set(key, customer);
        }
      });
      
      const uniqueCustomers = Array.from(uniqueCustomersMap.values());
      console.log(`🔍 [CLIENT] Clients après déduplication: ${uniqueCustomers.length}`);
      
      // Trier par nom
      const sortedCustomers = uniqueCustomers.sort((a: any, b: any) => 
        a.name.localeCompare(b.name)
      );

      console.log(`📊 [CLIENT] ${sortedCustomers.length} clients trouvés pour ${currentUser.email}`);
      
      setCustomers(sortedCustomers);
    } catch (error) {
      console.error('❌ [CLIENT] Erreur chargement clients:', error);
      Alert.alert('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerPress = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      customer_type: customer.customer_type,
      credit_limit: customer.credit_limit,
      credit_balance: customer.credit_balance,
    });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
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
              const customerData = await databaseService.getById('customers', customerId) as any;
              
              // Supprimer immédiatement en local
              await databaseService.delete('customers', customerId);
              console.log(`🗑️ [CLIENT] Client "${customerName}" supprimé localement`);
              
              // Invalider le cache
              databaseService.invalidateCache('customers');
              
              // Supprimer immédiatement dans Firebase si en ligne, sinon ajouter à la queue
              const isOnline = await networkService.isConnected();
              if (isOnline && customerData?.firebase_id) {
                try {
                  console.log('🌐 [CLIENT] Suppression immédiate dans Firebase...');
                  await firebaseService.deleteCustomer(customerData.firebase_id);
                  console.log('✅ [CLIENT] Client supprimé de Firebase immédiatement');
                } catch (firebaseError) {
                  console.warn('⚠️ [CLIENT] Erreur suppression Firebase, ajout à la queue:', firebaseError);
                  if (customerData) {
                    await syncService.addToSyncQueue('customers', customerId, 'delete', customerData);
                  }
                }
              } else if (customerData) {
                // Mode offline: ajouter à la queue
                await syncService.addToSyncQueue('customers', customerId, 'delete', customerData);
                console.log('🗑️ [CLIENT] Client ajouté à la queue de suppression Firebase (mode offline)');
              }
              
              // Recharger la liste
              await loadCustomers();
              
              Alert.alert('Succès', 'Client supprimé avec succès ! 🗑️');
            } catch (error) {
              console.error('❌ [CLIENT] Erreur suppression client:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le client');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editCustomer || !newCustomer.name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est requis');
      return;
    }

    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setLoading(false);
        return;
      }

      const customerData = {
        ...newCustomer,
        created_by: currentUser.uid,
        created_by_name: currentUser.email || currentUser.displayName || 'Utilisateur',
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      // Mettre à jour localement
      await databaseService.update('customers', editCustomer.id, customerData);
      console.log(`✅ [CLIENT] Client mis à jour localement: ${editCustomer.id}`);
      
      // Invalider le cache
      databaseService.invalidateCache('customers');
      
      // Ajouter à la queue de synchronisation
      await syncService.addToSyncQueue('customers', editCustomer.id, 'update', customerData);
      
      setShowEditModal(false);
      setEditCustomer(null);
      await loadCustomers();
      
      Alert.alert('Succès', 'Client mis à jour avec succès ! ✅');
    } catch (error) {
      console.error('❌ [CLIENT] Erreur mise à jour client:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le client');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est requis');
      return;
    }

    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setLoading(false);
        return;
      }

      const customerData = {
        ...newCustomer,
        created_by: currentUser.uid,
        created_by_name: currentUser.email || currentUser.displayName || 'Utilisateur',
        created_at: new Date().toISOString(),
        sync_status: 'pending' as const,
      };

      console.log('📝 [CLIENT] Données du client à créer:', JSON.stringify(customerData, null, 2));
      
      // Vérifier la connexion
      const isOnline = await networkService.isConnected();
      console.log('🌐 [CLIENT] État connexion:', isOnline ? 'ONLINE' : 'OFFLINE');
      
      let customerId: string;
      let firebaseId: string | undefined;
      
      if (isOnline) {
        // CRÉER DIRECTEMENT DANS FIREBASE
        try {
          console.log('🌐 [CLIENT] Création directe dans Firebase...');
          
          // Préparer les données pour Firebase
          const firebaseCustomerData = {
            name: customerData.name,
            phone: customerData.phone || '',
            email: customerData.email || '',
            address: customerData.address || '',
            customer_type: customerData.customer_type,
            credit_limit: customerData.credit_limit,
            credit_balance: customerData.credit_balance,
            created_by: customerData.created_by,
            created_by_name: customerData.created_by_name,
            sync_status: 'synced' as const,
          };
          
          firebaseId = await firebaseService.createCustomer(firebaseCustomerData);
          console.log(`✅ [CLIENT] Client créé dans Firebase avec ID: ${firebaseId}`);
          
          // Créer localement avec le firebase_id et marquer comme synchronisé
          const localCustomerData = {
            ...customerData,
            firebase_id: firebaseId,
            sync_status: 'synced' as const,
          };
          
          customerId = await databaseService.insert('customers', localCustomerData);
          console.log(`✅ [CLIENT] Client créé localement avec ID: ${customerId} et firebase_id: ${firebaseId}`);
          
        } catch (firebaseError) {
          console.error('❌ [CLIENT] Erreur création Firebase, fallback local:', firebaseError);
          // Fallback: créer localement seulement et ajouter à la queue
          const localCustomerData = {
            ...customerData,
            sync_status: 'pending' as const,
          };
          customerId = await databaseService.insert('customers', localCustomerData);
          console.log(`✅ [CLIENT] Client créé localement seulement avec ID: ${customerId}`);
          
          // Ajouter à la queue de synchronisation
          await syncService.addToSyncQueue('customers', customerId, 'create', localCustomerData);
          console.log('🔄 [CLIENT] Client ajouté à la queue de synchronisation');
        }
      } else {
        // MODE OFFLINE: créer localement seulement
        console.log('📱 [CLIENT] Mode offline, création locale uniquement');
        customerId = await databaseService.insert('customers', customerData);
        console.log(`✅ [CLIENT] Client créé localement avec ID: ${customerId}`);
        
        // Ajouter à la queue de synchronisation
        await syncService.addToSyncQueue('customers', customerId, 'create', customerData);
        console.log('🔄 [CLIENT] Client ajouté à la queue de synchronisation');
      }
      
      // Invalider le cache
      databaseService.invalidateCache('customers');
      
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type: 'retail',
        credit_limit: 0,
        credit_balance: 0,
      });
      await loadCustomers();
      
      Alert.alert('Succès', 'Client créé avec succès ! ✅');
    } catch (error) {
      console.error('❌ [CLIENT] Erreur création client:', error);
      Alert.alert('Erreur', 'Impossible de créer le client');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCustomerItem = (customer: Customer) => (
    <TouchableOpacity
      key={customer.id}
      style={styles.customerItem}
      onPress={() => handleCustomerPress(customer)}
    >
      <View style={styles.customerIcon}>
        <Ionicons 
          name={customer.customer_type === 'wholesale' ? 'business' : 'person'} 
          size={24} 
          color="#007AFF" 
        />
      </View>
      
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerType}>
          {customer.customer_type === 'wholesale' ? 'Gros' : 'Détail'}
        </Text>
        {customer.phone && (
          <Text style={styles.customerDetail}>📞 {customer.phone}</Text>
        )}
        {customer.email && (
          <Text style={styles.customerDetail}>✉️ {customer.email}</Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowDetailModal(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Détails Client</Text>
          
          <View style={styles.modalHeaderActions}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => selectedCustomer && handleEditCustomer(selectedCustomer)}
            >
              <Ionicons name="create-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => selectedCustomer && handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {selectedCustomer && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nom:</Text>
                <Text style={styles.detailValue}>{selectedCustomer.name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {selectedCustomer.customer_type === 'wholesale' ? 'Gros' : 'Détail'}
                </Text>
              </View>
              
              {selectedCustomer.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Téléphone:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.phone}</Text>
                </View>
              )}
              
              {selectedCustomer.email && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.email}</Text>
                </View>
              )}
              
              {selectedCustomer.address && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Adresse:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.address}</Text>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Limite de crédit:</Text>
                <Text style={styles.detailValue}>
                  {selectedCustomer.credit_limit.toLocaleString()} FCFA
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Solde crédit:</Text>
                <Text style={styles.detailValue}>
                  {selectedCustomer.credit_balance.toLocaleString()} FCFA
                </Text>
              </View>
              
              {selectedCustomer.created_at && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Créé le:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedCustomer.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        Keyboard.dismiss();
        setShowEditModal(false);
      }}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowEditModal(false);
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Modifier Client</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.modalContent}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du client"
              value={newCustomer.name}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
            />

            <Text style={styles.inputLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={newCustomer.phone}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newCustomer.email}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Adresse</Text>
            <TextInput
              style={styles.input}
              placeholder="Adresse"
              value={newCustomer.address}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
              multiline
            />

            <Text style={styles.inputLabel}>Type de client</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCustomer.customer_type === 'retail' && styles.typeButtonActive
                ]}
                onPress={() => setNewCustomer({ ...newCustomer, customer_type: 'retail' })}
              >
                <Text style={[
                  styles.typeButtonText,
                  newCustomer.customer_type === 'retail' && styles.typeButtonTextActive
                ]}>
                  Détail
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCustomer.customer_type === 'wholesale' && styles.typeButtonActive
                ]}
                onPress={() => setNewCustomer({ ...newCustomer, customer_type: 'wholesale' })}
              >
                <Text style={[
                  styles.typeButtonText,
                  newCustomer.customer_type === 'wholesale' && styles.typeButtonTextActive
                ]}>
                  Gros
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Limite de crédit (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={newCustomer.credit_limit.toString()}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, credit_limit: parseFloat(text) || 0 })}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEdit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        Keyboard.dismiss();
        setShowAddModal(false);
      }}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowAddModal(false);
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Nouveau Client</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.modalContent}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du client"
              value={newCustomer.name}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
            />

            <Text style={styles.inputLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={newCustomer.phone}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newCustomer.email}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Adresse</Text>
            <TextInput
              style={styles.input}
              placeholder="Adresse"
              value={newCustomer.address}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
              multiline
            />

            <Text style={styles.inputLabel}>Type de client</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCustomer.customer_type === 'retail' && styles.typeButtonActive
                ]}
                onPress={() => setNewCustomer({ ...newCustomer, customer_type: 'retail' })}
              >
                <Text style={[
                  styles.typeButtonText,
                  newCustomer.customer_type === 'retail' && styles.typeButtonTextActive
                ]}>
                  Détail
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCustomer.customer_type === 'wholesale' && styles.typeButtonActive
                ]}
                onPress={() => setNewCustomer({ ...newCustomer, customer_type: 'wholesale' })}
              >
                <Text style={[
                  styles.typeButtonText,
                  newCustomer.customer_type === 'wholesale' && styles.typeButtonTextActive
                ]}>
                  Gros
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Limite de crédit (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={newCustomer.credit_limit.toString()}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, credit_limit: parseFloat(text) || 0 })}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddCustomer}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Créer</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading && customers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des clients */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Aucun client trouvé' : 'Aucun client'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Essayez une autre recherche'
                : 'Ajoutez votre premier client pour commencer'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map(renderCustomerItem)
        )}
      </ScrollView>

      {/* Bouton flottant pour ajouter - Position corrigée */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: 50 + insets.bottom }
        ]}
        onPress={() => {
          setNewCustomer({
            name: '',
            phone: '',
            email: '',
            address: '',
            customer_type: 'retail',
            credit_limit: 0,
            credit_balance: 0,
          });
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add" size={dynamicSizes.fontSize.xlarge} color="#fff" />
      </TouchableOpacity>

      {renderDetailModal()}
      {renderEditModal()}
      {renderAddModal()}
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
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  customerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalScrollContent: {
    paddingBottom: 200, // Espace supplémentaire pour permettre de scroller au-delà du clavier
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

