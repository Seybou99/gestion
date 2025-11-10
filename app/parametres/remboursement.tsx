import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { databaseService } from '../../services/DatabaseService';
import { networkService } from '../../services/NetworkService';
import { getCurrentUser } from '../../utils/userInfo';

interface RefundItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Refund {
  id: string;
  sale_id: string;
  total_amount: number;
  refund_date: string;
  created_at?: string;
  employee_name?: string;
  customer_name?: string;
  payment_method: string;
  items: RefundItem[];
  user_id: string;
  created_by: string;
  created_by_name: string;
}

export default function RemboursementScreen() {
  const navigation = useNavigation();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadRefunds();
  }, []);

  // Recharger les remboursements quand l'écran reprend le focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 [REFUND] Écran en focus, rechargement des remboursements');
      loadRefunds();
    });

    return unsubscribe;
  }, [navigation]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [REFUND] Aucun utilisateur connecté');
        return;
      }

      console.log('📊 [REFUND] Chargement des remboursements pour:', currentUser.email);
      console.log('👤 [REFUND] UID utilisateur:', currentUser.uid);

      // Récupérer les remboursements depuis Firebase si connecté
      const isConnected = await networkService.isConnected();
      let allRefunds: any[] = [];
      
      console.log('🌐 [REFUND] État connexion:', isConnected ? 'ONLINE' : 'OFFLINE');
      
      // Charger tous les remboursements (getAllByUser filtre déjà par utilisateur)
      try {
        // Essayer d'abord getAllByUser qui filtre automatiquement
        allRefunds = await databaseService.getAllByUser('refunds', currentUser.uid) as any[];
        console.log('✅ [REFUND] Remboursements récupérés via getAllByUser:', allRefunds.length);
      } catch (error) {
        console.warn('⚠️ [REFUND] Erreur getAllByUser, fallback sur getAll:', error);
        // Fallback: charger tous et filtrer manuellement
        const allRefundsRaw = await databaseService.getAll('refunds') as any[];
        allRefunds = allRefundsRaw.filter((refund: any) => 
          refund.user_id === currentUser.uid || 
          refund.created_by === currentUser.uid
        );
        console.log('✅ [REFUND] Remboursements récupérés via getAll (filtré):', allRefunds.length);
      }
      
      console.log('📊 [REFUND] Total remboursements en base après filtrage:', allRefunds.length);
      
      // Log des remboursements pour diagnostic
      if (allRefunds.length > 0) {
        console.log('🔍 [REFUND] Détails des remboursements trouvés:');
        allRefunds.forEach((refund: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${refund.id}`);
          console.log(`      Montant: ${refund.total_amount} FCFA`);
          console.log(`      Date: ${refund.refund_date || refund.created_at}`);
          console.log(`      user_id: ${refund.user_id}`);
          console.log(`      created_by: ${refund.created_by}`);
          console.log('');
        });
      }
      
      // Utiliser directement allRefunds comme userRefunds (déjà filtré)
      const userRefunds = allRefunds;
      
      console.log('🔍 [REFUND] Remboursements après filtrage utilisateur:', userRefunds.length);
      
      // Trier par date (plus récent en premier)
      const sortedRefunds = userRefunds.sort((a: any, b: any) => {
        const dateA = a.refund_date || a.created_at || '';
        const dateB = b.refund_date || b.created_at || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      console.log(`📊 [REFUND] ${sortedRefunds.length} remboursements trouvés pour ${currentUser.email}`);
      
      setRefunds(sortedRefunds);
    } catch (error) {
      console.error('❌ [REFUND] Erreur chargement remboursements:', error);
      Alert.alert('Erreur', 'Impossible de charger les remboursements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setTimeout(() => {
      setSelectedRefund(null);
      setLoadingDetails(false);
    }, 200);
  };

  const handleRefundPress = async (refund: Refund) => {
    try {
      // Réinitialiser l'état avant de charger les nouveaux détails
      setSelectedRefund(null);
      setShowDetailModal(false);
      setLoadingDetails(true);
      
      console.log('🔍 [REFUND] Chargement détails remboursement:', refund.id);
      
      // Charger les items de remboursement depuis la base de données
      const allRefundItems = await databaseService.getAll('refund_items') as any[];
      const filteredItems = allRefundItems.filter(item => item.refund_id === refund.id);
      
      // Mapper les items au bon format
      const refundItems: RefundItem[] = filteredItems.map(item => ({
        id: item.id || '',
        product_name: item.product_name || 'Produit inconnu',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0
      }));
      
      console.log('📦 [REFUND] Items trouvés:', refundItems.length);
      
      // Créer le remboursement avec les items
      const refundWithItems = {
        ...refund,
        items: refundItems
      };
      
      // Attendre un court instant pour s'assurer que le modal est fermé
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setSelectedRefund(refundWithItems);
      setShowDetailModal(true);
    } catch (error) {
      console.error('❌ [REFUND] Erreur chargement détails remboursement:', error);
      // Fallback: afficher le remboursement sans items
      const refundWithItems = { ...refund, items: [] };
      setSelectedRefund(refundWithItems);
      setShowDetailModal(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  const renderRefundItem = (refund: Refund) => (
    <TouchableOpacity
      key={refund.id}
      style={styles.refundItem}
      onPress={() => handleRefundPress(refund)}
    >
      <View style={styles.refundIcon}>
        <Ionicons name="arrow-undo" size={24} color="#FF3B30" />
      </View>
      
      <View style={styles.refundInfo}>
        <Text style={styles.refundAmount}>
          {refund.total_amount.toLocaleString()} FCFA
        </Text>
        <Text style={styles.refundTime}>
          à {formatTime(refund.refund_date || refund.created_at || new Date().toISOString())}
        </Text>
        {refund.created_by_name && (
          <Text style={styles.refundEmployee}>
            Par {refund.created_by_name}
          </Text>
        )}
      </View>
      
      <View style={styles.refundMeta}>
        <Text style={styles.refundCode}>#{refund.id.slice(-8)}</Text>
        <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleCloseDetailModal}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Détails Remboursement</Text>
        </View>

        {selectedRefund && (
          <ScrollView style={styles.modalContent}>
            {/* Informations générales */}
            <View style={styles.detailCard}>
              <Text style={styles.totalAmount}>
                {selectedRefund.total_amount.toLocaleString()} FCFA
              </Text>
              <Text style={styles.refundDate}>
                {formatDate(selectedRefund.refund_date || selectedRefund.created_at || new Date().toISOString())}
              </Text>
              <Text style={styles.detailRefundCode}>
                Code: #{selectedRefund.id}
              </Text>
              <Text style={styles.detailSaleCode}>
                Vente: #{selectedRefund.sale_id}
              </Text>
              <Text style={styles.employeeInfo}>
                Employé: {selectedRefund.created_by_name || 'Non spécifié'}
              </Text>
              <Text style={styles.paymentMethod}>
                Mode paiement: {selectedRefund.payment_method}
              </Text>
            </View>

            {/* Liste des articles */}
            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Articles remboursés</Text>
              {loadingDetails ? (
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>Chargement des articles...</Text>
                </View>
              ) : selectedRefund.items && selectedRefund.items.length > 0 ? (
                selectedRefund.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemQuantity}>
                        {item.quantity} x {item.unit_price.toLocaleString()} FCFA
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {item.total_price.toLocaleString()} FCFA
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>Aucun article trouvé</Text>
                </View>
              )}
              
              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {selectedRefund.total_amount.toLocaleString()} FCFA
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des remboursements...</Text>
      </View>
    );
  }

  const groupRefundsByDate = (refunds: Refund[]) => {
    const grouped: { [key: string]: Refund[] } = {};
    
    refunds.forEach(refund => {
      const dateString = refund.refund_date || refund.created_at || '';
      if (!dateString) return;
      const dateKey = dateString.split('T')[0]; // YYYY-MM-DD
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(refund);
    });

    return grouped;
  };

  const groupedRefunds = groupRefundsByDate(refunds);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedRefunds).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="arrow-undo-outline" size={64} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>Aucun remboursement</Text>
            <Text style={styles.emptySubtitle}>
              Vos remboursements apparaîtront ici une fois effectués
            </Text>
          </View>
        ) : (
          Object.entries(groupedRefunds).map(([date, dateRefunds]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>
                {formatDateOnly(date)}
              </Text>
              {dateRefunds.map(renderRefundItem)}
            </View>
          ))
        )}
      </ScrollView>

      {renderDetailModal()}
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
  content: {
    flex: 1,
    paddingTop: 10,
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
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  refundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  refundIcon: {
    marginRight: 16,
  },
  refundInfo: {
    flex: 1,
  },
  refundAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 2,
  },
  refundTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  refundEmployee: {
    fontSize: 12,
    color: '#999',
  },
  refundMeta: {
    alignItems: 'flex-end',
  },
  refundCode: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  modalCloseButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
  refundDate: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailRefundCode: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  detailSaleCode: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  employeeInfo: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#999',
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

