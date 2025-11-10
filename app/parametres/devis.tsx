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
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/DatabaseService';
import { networkService } from '../../services/NetworkService';
import { getCurrentUser } from '../../utils/userInfo';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Quote {
  id: string;
  total_amount: number;
  quote_date: string;
  customer_name?: string;
  status: string;
  items: QuoteItem[];
  user_id: string;
  created_by: string;
  created_by_name: string;
  expiry_date?: string;
}

export default function DevisScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productQuantity, setProductQuantity] = useState('1');
  const [productPrice, setProductPrice] = useState('0');
  const [products, setProducts] = useState<any[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('🔄 [DEVIS] Écran en focus, rechargement des devis');
      loadQuotes();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    console.log('🔄 [DEVIS] État showMenuModal changé:', showMenuModal);
  }, [showMenuModal]);

  useEffect(() => {
    console.log('🔄 [DEVIS] État showCreateModal changé:', showCreateModal);
    if (showCreateModal) {
      loadProducts();
    }
  }, [showCreateModal]);

  const loadProducts = async () => {
    try {
      const allProducts = await databaseService.getAll('products') as any[];
      setProducts(allProducts);
      console.log('📦 [DEVIS] Produits chargés:', allProducts.length);
    } catch (error) {
      console.error('❌ [DEVIS] Erreur chargement produits:', error);
    }
  };

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [DEVIS] Aucun utilisateur connecté');
        return;
      }

      console.log('📊 [DEVIS] Chargement des devis pour:', currentUser.email);
      console.log('👤 [DEVIS] UID utilisateur:', currentUser.uid);

      const isConnected = await networkService.isConnected();
      let allQuotes: any[] = [];
      
      console.log('🌐 [DEVIS] État connexion:', isConnected ? 'ONLINE' : 'OFFLINE');
      
      if (isConnected) {
        try {
          console.log('📡 [DEVIS] Chargement depuis Firebase...');
          // Note: Vous devrez implémenter firebaseService.getQuotes() si ce n'est pas encore fait
          const localQuotes = await databaseService.getAll('quotes') as any[];
          console.log('✅ [DEVIS] Devis récupérés de base locale:', localQuotes.length);
          allQuotes = localQuotes;
        } catch (error) {
          console.error('❌ [DEVIS] Erreur chargement:', error);
          allQuotes = [];
        }
      } else {
        console.log('📱 [DEVIS] Mode offline - chargement depuis base locale');
        allQuotes = await databaseService.getAll('quotes') as any[];
      }

      // Filtrer les devis de l'utilisateur connecté
      const allowedOwners = currentUser.allowedOwnerIds || [currentUser.uid];
      const userQuotes = allQuotes.filter((quote: any) => {
        const ownerMatch = quote.created_by && allowedOwners.includes(quote.created_by);
        const userMatch = quote.user_id && allowedOwners.includes(quote.user_id);
        return ownerMatch || userMatch;
      });

      console.log('📊 [DEVIS] Total devis en base:', allQuotes.length);
      console.log('🔍 [DEVIS] Détails des devis trouvés:');
      userQuotes.forEach((quote, index) => {
        console.log(`   ${index + 1}. ID: ${quote.id}`);
        console.log(`      Montant: ${quote.total_amount} FCFA`);
        console.log(`      Date: ${quote.quote_date}`);
        console.log(`      user_id: ${quote.user_id}`);
        console.log(`      created_by: ${quote.created_by}`);
        console.log(`      created_by_name: ${quote.created_by_name}`);
        console.log('');
      });

      setQuotes(userQuotes);
      console.log('📊 [DEVIS]', userQuotes.length, 'devis trouvés pour', currentUser.email);
    } catch (error) {
      console.error('❌ [DEVIS] Erreur chargement devis:', error);
      Alert.alert('Erreur', 'Impossible de charger les devis');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleQuotePress = async (quote: Quote) => {
    try {
      setSelectedQuote(null);
      setShowDetailModal(false);
      setLoadingDetails(true);

      console.log('🔍 [DEVIS] Chargement détails devis:', quote.id);

      const allQuoteItems = await databaseService.getAll('quote_items') as any[];
      const filteredItems = allQuoteItems.filter(item => item.quote_id === quote.id);

      const quoteItems: QuoteItem[] = filteredItems.map(item => ({
        id: item.id || '',
        product_name: item.product_name || 'Produit inconnu',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0
      }));

      console.log('📦 [DEVIS] Items trouvés:', quoteItems.length);

      const quoteWithItems = {
        ...quote,
        items: quoteItems
      };

      await new Promise(resolve => setTimeout(resolve, 100));

      setSelectedQuote(quoteWithItems);
      setShowDetailModal(true);
    } catch (error) {
      console.error('❌ [DEVIS] Erreur chargement détails devis:', error);
      const quoteWithItems = { ...quote, items: [] };
      setSelectedQuote(quoteWithItems);
      setShowDetailModal(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setShowMenuModal(false);
    setTimeout(() => {
      setSelectedQuote(null);
      setLoadingDetails(false);
    }, 200);
  };

  const handleCloseMenuModal = () => {
    console.log('🔄 [DEVIS] Fermeture menu modal');
    setShowMenuModal(false);
  };

  const handleOpenMenuModal = () => {
    console.log('🔄 [DEVIS] Clic sur bouton menu');
    console.log('🔄 [DEVIS] selectedQuote:', selectedQuote ? selectedQuote.id : 'null');
    console.log('🔄 [DEVIS] showMenuModal avant ouverture:', showMenuModal);
    setShowMenuModal(true);
    console.log('🔄 [DEVIS] setShowMenuModal(true) appelé');
  };

  const generateQuoteHTML = (quote: Quote) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Devis #${quote.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .label {
            font-weight: bold;
            color: #666;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th,
          .items-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .items-table th {
            background-color: #007AFF;
            color: white;
          }
          .total-row {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #007AFF;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DEVIS</h1>
        </div>
        
        <div class="info-row">
          <span class="label">Client:</span>
          <span>${quote.customer_name || 'Non spécifié'}</span>
        </div>
        <div class="info-row">
          <span class="label">Date:</span>
          <span>${formatDate(quote.quote_date)}</span>
        </div>
        <div class="info-row">
          <span class="label">Statut:</span>
          <span>${quote.status}</span>
        </div>
        ${quote.expiry_date ? `
        <div class="info-row">
          <span class="label">Date expiration:</span>
          <span>${formatDate(quote.expiry_date)}</span>
        </div>
        ` : ''}
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Qté</th>
              <th>Prix unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit_price.toLocaleString()} FCFA</td>
                <td>${item.total_price.toLocaleString()} FCFA</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-row">
          TOTAL: ${quote.total_amount.toLocaleString()} FCFA
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    if (!selectedQuote) return;

    try {
      console.log('🖨️ [DEVIS] Début impression pour:', selectedQuote.id);
      const html = generateQuoteHTML(selectedQuote);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('🖨️ [DEVIS] Fichier PDF généré:', uri);

      await Print.printAsync({
        uri,
        printerUrl: undefined,
      });

      console.log('🖨️ [DEVIS] Impression complétée avec succès');
      Alert.alert('Succès', 'Devis envoyé à l\'imprimante');
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('did not complete') || errorMessage.includes('cancelled')) {
        console.log('🔄 [DEVIS] Impression annulée par l\'utilisateur');
      } else {
        console.error('❌ Erreur impression:', error);
        Alert.alert('Erreur', 'Impossible d\'imprimer le devis');
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedQuote) return;

    try {
      console.log('📥 [DEVIS] Début téléchargement pour:', selectedQuote.id);
      const html = generateQuoteHTML(selectedQuote);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('📥 [DEVIS] PDF généré:', uri);

      if (await Sharing.isAvailableAsync()) {
        console.log('📥 [DEVIS] Partage du PDF...');
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Télécharger le devis',
        });
        console.log('📥 [DEVIS] Partage terminé avec succès');
      } else {
        Alert.alert('Succès', 'Devis prêt à être téléchargé');
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement:', error);
      const errorMessage = error?.message || '';
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('user')) {
        Alert.alert('Erreur', 'Impossible de télécharger le devis');
      } else {
        console.log('🔄 [DEVIS] Téléchargement annulé par l\'utilisateur');
      }
    }
  };

  const handleShare = async () => {
    if (!selectedQuote) return;

    try {
      const itemsText = selectedQuote.items.map(item => 
        `• ${item.product_name} - ${item.quantity}x ${item.unit_price.toLocaleString()} FCFA = ${item.total_price.toLocaleString()} FCFA`
      ).join('\n');

      const message = `📄 DEVIS

📋 Code: #${selectedQuote.id}
💰 Montant total: ${selectedQuote.total_amount.toLocaleString()} FCFA
📅 Date: ${formatDate(selectedQuote.quote_date)}
👤 Client: ${selectedQuote.customer_name || 'Non spécifié'}
📊 Statut: ${selectedQuote.status}${selectedQuote.expiry_date ? `\n📅 Date expiration: ${formatDate(selectedQuote.expiry_date)}` : ''}

📦 ARTICLES:
${itemsText}

Merci de votre confiance !`;

      await Share.share({
        message,
        title: `Devis #${selectedQuote.id}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le devis');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      Alert.alert('Erreur', 'Veuillez sélectionner un produit');
      return;
    }

    const quantity = parseFloat(productQuantity) || 0;
    if (quantity <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return;
    }

    const price = parseFloat(productPrice) || 0;
    if (price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    const total = quantity * price;

    const newItem: QuoteItem = {
      id: `item_${Date.now()}`,
      product_name: selectedProduct.name || selectedProduct.product_name,
      quantity,
      unit_price: price,
      total_price: total,
    };

    setQuoteItems([...quoteItems, newItem]);
    setSelectedProduct(null);
    setProductQuantity('1');
    setProductPrice('0');
    setShowProductPicker(false);
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setProductPrice(product.selling_price?.toString() || product.price?.toString() || '0');
    setShowProductPicker(false);
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleCreateQuote = async () => {
    try {
      if (!customerName || quoteItems.length === 0) {
        Alert.alert('Erreur', 'Veuillez ajouter au moins un article et un nom de client');
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      const totalAmount = quoteItems.reduce((sum, item) => sum + item.total_price, 0);
      const ownerId = currentUser.accountOwnerId || currentUser.uid;
      const quoteData: any = {
        customer_name: customerName,
        total_amount: totalAmount,
        quote_date: new Date().toISOString(),
        status: 'en attente',
        payment_method: 'devis',
        user_id: currentUser.uid,
        created_by: ownerId,
        created_by_user_id: currentUser.uid,
        created_by_name: currentUser.email || 'Utilisateur',
      };

      const quoteId = await databaseService.insert('quotes', quoteData);
      console.log('✅ [DEVIS] Devis créé avec ID:', quoteId);

      // Créer les articles du devis
      for (const item of quoteItems) {
        await databaseService.insert('quote_items', {
          ...item,
          quote_id: quoteId,
        });
      }

      // Réinitialiser le formulaire
      setCustomerName('');
      setQuoteItems([]);
      setShowCreateModal(false);

      // Recharger la liste
      await loadQuotes();

      Alert.alert('Succès', 'Devis créé avec succès !');
    } catch (error) {
      console.error('❌ [DEVIS] Erreur création devis:', error);
      Alert.alert('Erreur', 'Impossible de créer le devis');
    }
  };

  const groupQuotesByDate = (quotes: Quote[]) => {
    const grouped: { [key: string]: Quote[] } = {};
    
    quotes.forEach(quote => {
      const dateKey = quote.quote_date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(quote);
    });

    return grouped;
  };

  const renderQuoteItem = (quote: Quote) => (
    <TouchableOpacity
      key={quote.id}
      style={styles.quoteItem}
      onPress={() => handleQuotePress(quote)}
    >
      <View style={styles.quoteHeader}>
        <Text style={styles.quoteCode}>#{quote.id.slice(-8)}</Text>
        <Text style={styles.quoteAmount}>{quote.total_amount.toLocaleString()} FCFA</Text>
      </View>
      
      <View style={styles.quoteMeta}>
        <View style={styles.quoteDate}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{formatDate(quote.quote_date)}</Text>
        </View>
        
        <View style={[styles.statusBadge, 
          quote.status === 'accepté' ? styles.statusAccepted : 
          quote.status === 'refusé' ? styles.statusRejected : 
          styles.statusPending]}>
          <Text style={styles.statusText}>{quote.status}</Text>
        </View>
      </View>
      
      {quote.customer_name && (
        <View style={styles.quoteCustomer}>
          <Ionicons name="person-outline" size={14} color="#999" />
          <Text style={styles.customerText}>{quote.customer_name}</Text>
        </View>
      )}
      
      <View style={styles.quoteActions}>
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

        {selectedQuote && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailCard}>
              <Text style={styles.totalAmount}>
                {selectedQuote.total_amount.toLocaleString()} FCFA
              </Text>
              <Text style={styles.detailQuoteDate}>
                {formatDate(selectedQuote.quote_date)}
              </Text>
              <Text style={styles.detailSaleCode}>
                Code: #{selectedQuote.id}
              </Text>
              <Text style={styles.employeeInfo}>
                Client: {selectedQuote.customer_name || 'Non spécifié'}
              </Text>
              <Text style={styles.paymentMethod}>
                Statut: {selectedQuote.status}
              </Text>
            </View>

            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Articles</Text>
              {loadingDetails ? (
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>Chargement des articles...</Text>
                </View>
              ) : selectedQuote.items && selectedQuote.items.length > 0 ? (
                selectedQuote.items.map((item, index) => (
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
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {selectedQuote.total_amount.toLocaleString()} FCFA
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        <View style={styles.modalFooter}>
          <Text style={styles.footerNote}>
            Merci de votre confiance
          </Text>
        </View>
      </View>

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
                  console.log('🔄 [DEVIS] Clic sur Télécharger');
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
                  console.log('🔄 [DEVIS] Clic sur Partager');
                  setShowMenuModal(false);
                  setTimeout(() => handleShare(), 100);
                }}
              >
                <Ionicons name="share-outline" size={24} color="#007AFF" />
                <Text style={styles.menuItemText}>Partager devis</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  console.log('🔄 [DEVIS] Clic sur Imprimer');
                  setShowMenuModal(false);
                  setTimeout(() => handlePrint(), 100);
                }}
              >
                <Ionicons name="print-outline" size={24} color="#007AFF" />
                <Text style={styles.menuItemText}>Imprimer devis</Text>
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
        <Text style={styles.loadingText}>Chargement des devis...</Text>
      </View>
    );
  }

  const groupedQuotes = groupQuotesByDate(quotes);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedQuotes).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>Aucun devis</Text>
            <Text style={styles.emptySubtitle}>
              Vos devis apparaîtront ici une fois créés
            </Text>
          </View>
        ) : (
          Object.entries(groupedQuotes).map(([date, dateQuotes]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>
                {formatDateOnly(date)}
              </Text>
              {dateQuotes.map(renderQuoteItem)}
            </View>
          ))
        )}
      </ScrollView>

      {/* Bouton flottant pour créer un devis */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 100 }]}
        onPress={() => {
          console.log('✅ [DEVIS] Bouton FAB cliqué');
          console.log('✅ [DEVIS] showCreateModal avant:', showCreateModal);
          setShowCreateModal(true);
          console.log('✅ [DEVIS] setShowCreateModal(true) appelé');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderDetailModal()}

      {/* Modal de création de devis */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Nouveau devis</Text>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Nom du client */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du client *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du client"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            {/* Articles du devis */}
            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>Articles ({quoteItems.length})</Text>
              
              {quoteItems.map((item, index) => (
                <View key={index} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product_name}</Text>
                    <Text style={styles.cartItemDetails}>
                      {item.quantity}x à {item.unit_price.toLocaleString()} FCFA
                    </Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <Text style={styles.cartItemTotal}>
                      {item.total_price.toLocaleString()} FCFA
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Formulaire d'ajout d'article */}
              <View style={styles.addItemForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom du produit *</Text>
                  <TouchableOpacity
                    style={styles.productSelectButton}
                    onPress={() => setShowProductPicker(!showProductPicker)}
                  >
                    <Text style={styles.productSelectText}>
                      {selectedProduct ? (selectedProduct.name || selectedProduct.product_name) : 'Sélectionner un produit'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {showProductPicker && products.length > 0 && (
                    <View style={styles.productPicker}>
                      <ScrollView style={styles.productPickerList} nestedScrollEnabled>
                        {products.map((product) => (
                          <TouchableOpacity
                            key={product.id}
                            style={styles.productOption}
                            onPress={() => handleProductSelect(product)}
                          >
                            <Text style={styles.productOptionText}>
                              {product.name || product.product_name}
                            </Text>
                            {product.code && (
                              <Text style={styles.productOptionCode}>({product.code})</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroupHalf}>
                    <Text style={styles.inputLabel}>Quantité *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1"
                      keyboardType="numeric"
                      value={productQuantity}
                      onChangeText={setProductQuantity}
                    />
                  </View>
                  <View style={styles.inputGroupHalf}>
                    <Text style={styles.inputLabel}>Prix unitaire *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={productPrice}
                      onChangeText={setProductPrice}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddItem}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {quoteItems.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()} FCFA
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, quoteItems.length === 0 && styles.saveButtonDisabled]}
              onPress={handleCreateQuote}
              disabled={quoteItems.length === 0}
            >
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
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
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  quoteItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteCode: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quoteAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  quoteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAccepted: {
    backgroundColor: '#d4edda',
  },
  statusRejected: {
    backgroundColor: '#f8d7da',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  quoteCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  customerText: {
    fontSize: 13,
    color: '#666',
  },
  quoteActions: {
    alignItems: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  menuButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  detailQuoteDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailSaleCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  employeeInfo: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
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
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Styles pour le modal de création
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addItemForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cartItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cartItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  removeButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  productSelectButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productSelectText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  productPicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productPickerList: {
    maxHeight: 200,
  },
  productOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  productOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  productOptionCode: {
    fontSize: 14,
    color: '#666',
  },
});

