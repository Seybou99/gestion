import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/DatabaseService';
import { firebaseService } from '../../services/FirebaseService';
import { networkService } from '../../services/NetworkService';
import { syncService } from '../../services/SyncService';
import { AppDispatch } from '../../store';
import { updateStockLocally } from '../../store/slices/productSlice';
import { getCurrentUser } from '../../utils/userInfo';

interface SaleItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  total_amount: number;
  sale_date: string;
  employee_name?: string;
  customer_name?: string;
  customer_id?: string;
  location_id?: string;
  tax_amount?: number;
  discount_amount?: number;
  payment_method: string;
  payment_status?: 'paid' | 'pending' | 'refunded';
  items: SaleItem[];
  user_id: string;
  created_by: string;
  created_by_name: string;
}

export default function RecuScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  // Recharger les ventes quand l'écran reprend le focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 [RECU] Écran en focus, rechargement des ventes');
      loadSales();
    });

    return unsubscribe;
  }, [navigation]);

  // Logger les changements de showMenuModal
  useEffect(() => {
    console.log('🔄 [RECU] État showMenuModal changé:', showMenuModal);
  }, [showMenuModal]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [RECU] Aucun utilisateur connecté');
        return;
      }

      console.log('📊 [RECU] Chargement des ventes pour:', currentUser.email);
      console.log('👤 [RECU] UID utilisateur:', currentUser.uid);

      // Récupérer les ventes depuis Firebase si connecté
      const isConnected = await networkService.isConnected();
      let allSales: any[] = [];
      
      console.log('🌐 [RECU] État connexion:', isConnected ? 'ONLINE' : 'OFFLINE');
      
      if (isConnected) {
        try {
          console.log('📡 [RECU] Chargement depuis Firebase...');
          const firebaseSales = await firebaseService.getSales();
          console.log('✅ [RECU] Ventes récupérées de Firebase:', firebaseSales.length);
          allSales = firebaseSales as any[];
        } catch (error) {
          console.error('❌ [RECU] Erreur chargement Firebase:', error);
          // Fallback sur les ventes locales
          console.log('📱 [RECU] Fallback sur ventes locales');
          allSales = await databaseService.getAll('sales') as any[];
        }
      } else {
        // Mode offline: utiliser les ventes locales
        console.log('📱 [RECU] Mode offline, utilisation ventes locales');
        allSales = await databaseService.getAll('sales') as any[];
      }
      
      console.log('📊 [RECU] Total ventes en base:', allSales.length);
      
      // Log des ventes pour diagnostic
      if (allSales.length > 0) {
        console.log('🔍 [RECU] Détails des ventes trouvées:');
        allSales.forEach((sale: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${sale.id}`);
          console.log(`      Montant: ${sale.total_amount} FCFA`);
          console.log(`      Date: ${sale.sale_date}`);
          console.log(`      user_id: ${sale.user_id}`);
          console.log(`      created_by: ${sale.created_by}`);
          console.log(`      created_by_name: ${sale.created_by_name}`);
          console.log('');
        });
      }
      
      // Filtrer par utilisateur si nécessaire
      // Firebase filtre déjà par user_id, donc pas besoin de filtrer à nouveau
      // Si mode offline, filtrer manuellement
      let userSales = allSales;
      
      if (!isConnected) {
        // Mode offline: filtrer manuellement
        userSales = allSales.filter((sale: any) => 
          sale.user_id === currentUser.uid || 
          sale.created_by === currentUser.uid
        );
        console.log('🔍 [RECU] Ventes après filtrage offline:', userSales.length);
      }
      
      // Trier par date (plus récent en premier)
      const sortedSales = userSales.sort((a: any, b: any) => 
        new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      );

      console.log(`📊 [RECU] ${sortedSales.length} ventes trouvées pour ${currentUser.email}`);
      
      setSales(sortedSales);
    } catch (error) {
      console.error('❌ [RECU] Erreur chargement ventes:', error);
      Alert.alert('Erreur', 'Impossible de charger les ventes');
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
    setShowMenuModal(false);
    // Petit délai avant de réinitialiser pour éviter les flashs visuels
    setTimeout(() => {
      setSelectedSale(null);
      setLoadingDetails(false);
    }, 200);
  };

  const handleCloseMenuModal = () => {
    console.log('🔄 [RECU] Fermeture menu modal');
    setShowMenuModal(false);
  };

  const handleOpenMenuModal = () => {
    console.log('🔄 [RECU] Clic sur bouton menu');
    console.log('🔄 [RECU] selectedSale:', selectedSale ? selectedSale.id : 'null');
    console.log('🔄 [RECU] showMenuModal avant ouverture:', showMenuModal);
    setShowMenuModal(true);
    console.log('🔄 [RECU] setShowMenuModal(true) appelé');
  };

  const handleSalePress = async (sale: Sale) => {
    try {
      // Réinitialiser l'état avant de charger les nouveaux détails
      setSelectedSale(null);
      setShowDetailModal(false);
      setLoadingDetails(true);
      
      console.log('🔍 [RECU] Chargement détails vente:', sale.id);
      
      // Charger les items de vente depuis la base de données
      const allSaleItems = await databaseService.getAll('sale_items') as any[];
      const filteredItems = allSaleItems.filter(item => item.sale_id === sale.id);
      
      // Mapper les items au bon format
      const saleItems: SaleItem[] = filteredItems.map(item => ({
        id: item.id || '',
        product_id: item.product_id || '',
        product_name: item.product_name || 'Produit inconnu',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0
      }));
      
      console.log('📦 [RECU] Items trouvés:', saleItems.length);
      if (saleItems.length > 0) {
        console.log('📦 [RECU] Détails items:', saleItems.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        })));
      }
      
      // Créer la vente avec les items
      const saleWithItems = {
        ...sale,
        items: saleItems,
        payment_status: sale.payment_status || 'paid' // Assurer que payment_status est présent
      };
      
      // Attendre un court instant pour s'assurer que le modal est fermé
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setSelectedSale(saleWithItems);
      setShowDetailModal(true);
    } catch (error) {
      console.error('❌ [RECU] Erreur chargement détails vente:', error);
      // Fallback: afficher la vente sans items
      const saleWithItems = { ...sale, items: [] };
      setSelectedSale(saleWithItems);
      setShowDetailModal(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedSale) return;

    // Vérifier si la vente a déjà été remboursée
    const saleCheck = await databaseService.getById('sales', selectedSale.id) as any;
    if (saleCheck?.payment_status === 'refunded') {
      Alert.alert('Information', 'Cette vente a déjà été remboursée');
      return;
    }

    Alert.alert(
      'Remboursement',
      `Êtes-vous sûr de vouloir rembourser cette vente de ${selectedSale.total_amount.toLocaleString()} FCFA ?\n\nLes produits seront rajoutés au stock.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rembourser',
          style: 'destructive',
          onPress: async () => {
            await processRefund();
          }
        }
      ]
    );
  };

  const processRefund = async () => {
    if (!selectedSale || !selectedSale.items || selectedSale.items.length === 0) {
      Alert.alert('Erreur', 'Impossible de rembourser : aucun article trouvé');
      return;
    }

    try {
      setProcessingRefund(true);
      
      // Récupérer l'utilisateur actuel
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setProcessingRefund(false);
        return;
      }

      console.log('🔄 [REFUND] Début remboursement pour vente:', selectedSale.id);

      // 1. Créer l'enregistrement de remboursement
      const refundData = {
        sale_id: selectedSale.id,
        user_id: currentUser.uid,
        customer_id: selectedSale.customer_id || null,
        location_id: selectedSale.location_id || 'default_location',
        total_amount: selectedSale.total_amount,
        tax_amount: selectedSale.tax_amount || 0,
        discount_amount: selectedSale.discount_amount || 0,
        payment_method: selectedSale.payment_method,
        refund_date: new Date().toISOString(),
        created_by: currentUser.uid,
        created_by_name: currentUser.displayName || currentUser.email || 'Utilisateur',
        notes: `Remboursement de la vente #${selectedSale.id}`,
        sync_status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const refundId = await databaseService.insert('refunds', refundData);
      console.log('✅ [REFUND] Remboursement créé avec ID:', refundId);

      // 2. Créer les items de remboursement et mettre à jour le stock
      const isOnlineCheck = await networkService.isConnected();
      
      for (const item of selectedSale.items) {
        // Créer l'item de remboursement
        const refundItemData = {
          refund_id: refundId,
          product_id: item.product_id || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product_name || 'Produit inconnu',
        };
        await databaseService.insert('refund_items', refundItemData);
        console.log('✅ [REFUND] Item de remboursement créé:', refundItemData.product_name);

        // Mettre à jour le stock (AJOUTER au lieu de soustraire)
        const allStockItems = await databaseService.getAll('stock') as any[];
        const stockItems = allStockItems.filter(stock => 
          stock.product_id === item.product_id && 
          stock.created_by === currentUser.uid
        );
        
        if (stockItems.length > 0) {
          const stockItem = stockItems[0] as any;
          const newStock = stockItem.quantity_current + item.quantity; // AJOUT au lieu de soustraction
          
          if (isOnlineCheck) {
            // Mode ONLINE : Mettre à jour directement dans Firebase
            try {
              console.log(`🌐 [REFUND ONLINE] Mise à jour stock dans Firebase: ${item.product_name || 'Produit'} -> ${newStock}`);
              
              await firebaseService.updateStockByProductId(item.product_id || '', {
                quantity_current: newStock,
                last_movement_date: new Date().toISOString(),
                last_movement_type: 'refund',
              });
              
              // Si succès, marquer comme synchronisé
              await databaseService.update('stock', stockItem.id, {
                quantity_current: newStock,
                last_movement_date: new Date().toISOString(),
                last_movement_type: 'refund',
                sync_status: 'synced',
              });
              
              console.log(`✅ [REFUND ONLINE] Stock mis à jour dans Firebase: ${item.product_name || 'Produit'} -> ${newStock}`);
            } catch (firebaseError) {
              console.warn(`⚠️ [REFUND ONLINE] Erreur Firebase, fallback local:`, firebaseError);
              
              // Fallback vers le mode offline
              await databaseService.update('stock', stockItem.id, {
                quantity_current: newStock,
                last_movement_date: new Date().toISOString(),
                last_movement_type: 'refund',
                sync_status: 'pending',
              });
              
              // Ajouter à la queue de synchronisation
              await syncService.addToSyncQueue('stock', stockItem.id, 'update', {
                product_id: item.product_id,
                quantity_current: newStock,
                last_movement_date: new Date().toISOString(),
                last_movement_type: 'refund',
              });
            }
          } else {
            // Mode OFFLINE : Mettre à jour localement et ajouter à la queue
            await databaseService.update('stock', stockItem.id, {
              quantity_current: newStock,
              last_movement_date: new Date().toISOString(),
              last_movement_type: 'refund',
              sync_status: 'pending',
            });
            
            // Ajouter à la queue de synchronisation
            await syncService.addToSyncQueue('stock', stockItem.id, 'update', {
              product_id: item.product_id,
              quantity_current: newStock,
              last_movement_date: new Date().toISOString(),
              last_movement_type: 'refund',
            });
            
            console.log(`📱 [REFUND OFFLINE] Stock augmenté localement et ajouté à la queue: ${item.product_name || 'Produit'} -> ${newStock}`);
          }
          
          // Mettre à jour le stock dans le store Redux pour un affichage instantané
          dispatch(updateStockLocally({ productId: item.product_id || '', newStock }));
        } else {
          console.warn(`⚠️ [REFUND] Stock non trouvé pour produit: ${item.product_id}`);
        }
      }

      // 3. Supprimer la vente et ses items de l'historique
      // Supprimer d'abord les items de vente
      const allSaleItems = await databaseService.getAll('sale_items') as any[];
      const saleItemsToDelete = allSaleItems.filter(item => item.sale_id === selectedSale.id);
      
      for (const saleItem of saleItemsToDelete) {
        await databaseService.delete('sale_items', saleItem.id);
        console.log(`🗑️ [REFUND] Item de vente supprimé: ${saleItem.id}`);
        
        // Ajouter à la queue de synchronisation pour suppression Firebase
        await syncService.addToSyncQueue('sale_items', saleItem.id, 'delete', saleItem);
      }
      
      // Récupérer les données de la vente avant suppression pour la sync
      const saleDataForDelete = await databaseService.getById('sales', selectedSale.id) as any;
      
      // Supprimer la vente localement
      await databaseService.delete('sales', selectedSale.id);
      console.log('🗑️ [REFUND] Vente supprimée localement');
      
      // Supprimer immédiatement dans Firebase si en ligne, sinon ajouter à la queue
      if (isOnlineCheck && saleDataForDelete) {
        try {
          console.log('🌐 [REFUND] Suppression immédiate dans Firebase...');
          await firebaseService.deleteSale(selectedSale.id);
          console.log('✅ [REFUND] Vente supprimée de Firebase immédiatement');
        } catch (firebaseError) {
          console.warn('⚠️ [REFUND] Erreur suppression Firebase, ajout à la queue:', firebaseError);
          // Fallback: ajouter à la queue si la suppression immédiate échoue
          await syncService.addToSyncQueue('sales', selectedSale.id, 'delete', saleDataForDelete);
          console.log('🗑️ [REFUND] Vente ajoutée à la queue de suppression Firebase');
        }
      } else if (saleDataForDelete) {
        // Mode offline: ajouter à la queue
        await syncService.addToSyncQueue('sales', selectedSale.id, 'delete', saleDataForDelete);
        console.log('🗑️ [REFUND] Vente ajoutée à la queue de suppression Firebase (mode offline)');
      }

      // 4. Ajouter à la queue de synchronisation pour le remboursement
      await syncService.addToSyncQueue('refunds', refundId, 'create', refundData);
      console.log('✅ [REFUND] Remboursement ajouté à la queue de synchronisation');

      // 5. Invalider les caches
      databaseService.invalidateCache('refunds');
      databaseService.invalidateCache('refund_items');
      databaseService.invalidateCache('stock');
      databaseService.invalidateCache('sales');
      databaseService.invalidateCache('sale_items');

      // 6. Fermer le modal et recharger les ventes
      setShowDetailModal(false);
      await loadSales();
      
      Alert.alert(
        'Remboursement Réussi! ✅',
        `Remboursement #${refundId}\nMontant: ${selectedSale.total_amount.toLocaleString()} FCFA\n\nLes produits ont été rajoutés au stock.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ [REFUND] Erreur remboursement:', error);
      Alert.alert('Erreur', 'Impossible de traiter le remboursement');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleShare = async () => {
    if (!selectedSale) return;

    try {
      const itemsText = selectedSale.items.map(item => 
        `• ${item.product_name} - ${item.quantity}x ${item.unit_price.toLocaleString()} FCFA = ${item.total_price.toLocaleString()} FCFA`
      ).join('\n');

      const message = `🧾 REÇU DE VENTE

📋 Code: #${selectedSale.id}
💰 Montant total: ${selectedSale.total_amount.toLocaleString()} FCFA
📅 Date: ${formatDate(selectedSale.sale_date)}
👤 Employé: ${selectedSale.created_by_name || 'Non spécifié'}
💳 Mode de paiement: ${selectedSale.payment_method}

📦 ARTICLES VENDUS:
${itemsText}

Merci pour votre achat !`;

      await Share.share({
        message,
        title: `Reçu de vente #${selectedSale.id}`,
        url: undefined, // Pas d'URL pour le moment
      });
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le reçu');
    }
  };

  const generateReceiptHTML = (sale: Sale) => {
    const itemsHTML = sale.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.unit_price.toLocaleString()} FCFA</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${item.total_price.toLocaleString()} FCFA</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Vente</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 5px;
          }
          .receipt-title {
            font-size: 18px;
            color: #333;
          }
          .receipt-info {
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .info-label {
            font-weight: bold;
            color: #666;
          }
          .info-value {
            color: #333;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            background-color: #f8f9fa;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #007AFF;
          }
          .total-section {
            border-top: 2px solid #007AFF;
            padding-top: 15px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .total-label {
            font-weight: bold;
            color: #333;
          }
          .total-value {
            font-weight: bold;
            color: #007AFF;
          }
          .grand-total {
            font-size: 20px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">MON ENTREPRISE</div>
          <div class="receipt-title">REÇU DE VENTE</div>
        </div>

        <div class="receipt-info">
          <div class="info-row">
            <span class="info-label">Code de vente:</span>
            <span class="info-value">#${sale.id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">${formatDate(sale.sale_date)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Employé:</span>
            <span class="info-value">${sale.created_by_name || 'Non spécifié'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mode de paiement:</span>
            <span class="info-value">${sale.payment_method}</span>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Article</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix unitaire</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span class="total-label">SOUS-TOTAL:</span>
            <span class="total-value">${sale.total_amount.toLocaleString()} FCFA</span>
          </div>
          <div class="total-row">
            <span class="total-label">TVA:</span>
            <span class="total-value">0 FCFA</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">TOTAL À PAYER:</span>
            <span class="total-value">${sale.total_amount.toLocaleString()} FCFA</span>
          </div>
        </div>

        <div class="footer">
          <p>Merci pour votre achat !</p>
          <p>Reçu généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    if (!selectedSale) return;

    try {
      console.log('🖨️ [RECU] Début impression pour:', selectedSale.id);
      const html = generateReceiptHTML(selectedSale);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('🖨️ [RECU] Fichier PDF généré:', uri);

      await Print.printAsync({
        uri,
        printerUrl: undefined, // Utilise l'imprimante par défaut
      });

      console.log('🖨️ [RECU] Impression complétée avec succès');
      Alert.alert('Succès', 'Reçu envoyé à l\'imprimante');
    } catch (error: any) {
      // Ne pas afficher d'erreur si l'utilisateur a simplement annulé
      const errorMessage = error?.message || '';
      if (errorMessage.includes('did not complete') || errorMessage.includes('cancelled')) {
        console.log('🔄 [RECU] Impression annulée par l\'utilisateur');
      } else {
        console.error('❌ Erreur impression:', error);
        Alert.alert('Erreur', 'Impossible d\'imprimer le reçu');
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedSale) return;

    try {
      console.log('📥 [RECU] Début téléchargement pour:', selectedSale.id);
      const html = generateReceiptHTML(selectedSale);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('📥 [RECU] PDF généré:', uri);

      if (await Sharing.isAvailableAsync()) {
        console.log('📥 [RECU] Partage du PDF...');
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Télécharger le reçu',
        });
        console.log('📥 [RECU] Partage terminé avec succès');
      } else {
        Alert.alert('Succès', 'Reçu prêt à être téléchargé');
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement:', error);
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('user')) {
        Alert.alert('Erreur', 'Impossible de télécharger le reçu');
      } else {
        console.log('🔄 [RECU] Téléchargement annulé par l\'utilisateur');
      }
    }
  };

  const groupSalesByDate = (sales: Sale[]) => {
    const grouped: { [key: string]: Sale[] } = {};
    
    sales.forEach(sale => {
      const dateKey = sale.sale_date.split('T')[0]; // YYYY-MM-DD
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(sale);
    });

    return grouped;
  };

  const renderSaleItem = (sale: Sale) => (
    <TouchableOpacity
      key={sale.id}
      style={styles.saleItem}
      onPress={() => handleSalePress(sale)}
    >
      <View style={styles.saleIcon}>
        <Ionicons name="receipt-outline" size={24} color="#34C759" />
      </View>
      
      <View style={styles.saleInfo}>
        <Text style={styles.saleAmount}>
          {sale.total_amount.toLocaleString()} FCFA
        </Text>
        <Text style={styles.saleTime}>
          à {formatTime(sale.sale_date)}
        </Text>
        {sale.created_by_name && (
          <Text style={styles.saleEmployee}>
            Par {sale.created_by_name}
          </Text>
        )}
      </View>
      
      <View style={styles.saleMeta}>
        <Text style={styles.saleCode}>#{sale.id.slice(-8)}</Text>
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
          
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalTitle}>Détails</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleOpenMenuModal}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {selectedSale && (
          <ScrollView style={styles.modalContent}>
            {/* Informations générales */}
            <View style={styles.detailCard}>
              <Text style={styles.totalAmount}>
                {selectedSale.total_amount.toLocaleString()} FCFA
              </Text>
              <Text style={styles.saleDate}>
                {formatDate(selectedSale.sale_date)}
              </Text>
              <Text style={styles.detailSaleCode}>
                Code: #{selectedSale.id}
              </Text>
              <Text style={styles.employeeInfo}>
                Employé: {selectedSale.created_by_name || 'Non spécifié'}
              </Text>
              <Text style={styles.paymentMethod}>
                Mode paiement: {selectedSale.payment_method}
              </Text>
            </View>

            {/* Liste des articles */}
            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Articles vendus</Text>
              {loadingDetails ? (
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>Chargement des articles...</Text>
                </View>
              ) : selectedSale.items && selectedSale.items.length > 0 ? (
                selectedSale.items.map((item, index) => (
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
                  {selectedSale.total_amount.toLocaleString()} FCFA
                </Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>NET A PAYER</Text>
                <Text style={styles.totalValue}>
                  {selectedSale.total_amount.toLocaleString()} FCFA
                </Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Montant Reçu</Text>
                <Text style={styles.totalValue}>
                  {selectedSale.total_amount.toLocaleString()} FCFA
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Bouton remboursement */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.refundButton, (processingRefund || selectedSale?.payment_status === 'refunded') && styles.refundButtonDisabled]}
            onPress={handleRefund}
            disabled={processingRefund || selectedSale?.payment_status === 'refunded'}
          >
            {processingRefund ? (
              <>
                <Ionicons name="hourglass-outline" size={20} color="#fff" />
                <Text style={styles.refundButtonText}>TRAITEMENT...</Text>
              </>
            ) : selectedSale?.payment_status === 'refunded' ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.refundButtonText}>DÉJÀ REMBOURSÉ</Text>
              </>
            ) : (
              <>
            <Ionicons name="arrow-undo" size={20} color="#fff" />
            <Text style={styles.refundButtonText}>REMBOURSEMENT</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu modal */}
      {showMenuModal && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseMenuModal}
          />
          <View style={styles.menuOverlay} pointerEvents="box-none">
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  console.log('🔄 [RECU] Clic sur Télécharger');
                  setShowMenuModal(false);
                  setTimeout(() => handleDownload(), 100);
                }}
              >
                <Ionicons name="cloud-download-outline" size={24} color="#007AFF" />
                <Text style={styles.menuItemText}>Télécharger</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  console.log('🔄 [RECU] Clic sur Partager');
                  setShowMenuModal(false);
                  setTimeout(() => handleShare(), 100);
                }}
              >
                <Ionicons name="share-outline" size={24} color="#007AFF" />
                <Text style={styles.menuItemText}>Partager facture</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  console.log('🔄 [RECU] Clic sur Imprimer');
                  setShowMenuModal(false);
                  setTimeout(() => handlePrint(), 100);
                }}
              >
                <Ionicons name="print-outline" size={24} color="#007AFF" />
                <Text style={styles.menuItemText}>Imprimer reçu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des ventes...</Text>
      </View>
    );
  }

  const groupedSales = groupSalesByDate(sales);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedSales).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>Aucune vente</Text>
            <Text style={styles.emptySubtitle}>
              Vos ventes apparaîtront ici une fois effectuées
            </Text>
          </View>
        ) : (
          Object.entries(groupedSales).map(([date, dateSales]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>
                {formatDateOnly(date)}
              </Text>
              {dateSales.map(renderSaleItem)}
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
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleIcon: {
    marginRight: 16,
  },
  saleInfo: {
    flex: 1,
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  saleTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  saleEmployee: {
    fontSize: 12,
    color: '#999',
  },
  saleMeta: {
    alignItems: 'flex-end',
  },
  saleCode: {
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
  modalHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuButton: {
    padding: 8,
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
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  saleDate: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
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
    color: '#1a1a1a',
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  refundButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refundButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 16,
  },
});
