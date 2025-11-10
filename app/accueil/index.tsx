import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { databaseService } from '../../services/DatabaseService';
import { AppDispatch, RootState } from '../../store';
import { getCurrentUser } from '../../utils/userInfo';

const { width } = Dimensions.get('window');

/**
 * Écran d'Accueil - Dashboard Principal
 * 
 * Affiche les informations principales et les raccourcis
 * vers les différentes sections de l'application.
 */
export default function AccueilScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { products } = useSelector((state: RootState) => state.products);
  const { sales } = useSelector((state: RootState) => state.sales);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalSales: 0,
    activeCustomers: 0,
    todaySales: 0,
    weeklyGrowth: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [weeklySalesData, setWeeklySalesData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  const [stockRotationRate, setStockRotationRate] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyActivities, setHistoryActivities] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Charger les données du dashboard
  useEffect(() => {
    loadDashboardMetrics();
  }, [products, sales.length]); // Recharger quand les ventes changent

  // Recharger les données quand l'application redevient active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 [DASHBOARD] Application active, rechargement des métriques');
        loadDashboardMetrics();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      // Invalider le cache pour forcer le rechargement des données réelles
      databaseService.invalidateCache('sales');
      databaseService.invalidateCache('sale_items');
      databaseService.invalidateCache('products');
      databaseService.invalidateCache('stock');
      databaseService.invalidateCache('customers');
      
      // Récupérer l'utilisateur connecté
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [DASHBOARD] Aucun utilisateur connecté');
        return;
      }
      
      console.log('📊 [DASHBOARD] Chargement métriques pour:', currentUser.email);
      
      // Récupérer les produits avec stock
      const allProductsWithStock = await databaseService.getProductsWithStock();
      const productsWithStock = allProductsWithStock.filter(p => p.created_by === currentUser.uid);
      
      const allLowStockProducts = await databaseService.getLowStockProducts();
      const lowStockProducts = allLowStockProducts.filter(p => p.created_by === currentUser.uid);
      
      console.log('📊 [LOW STOCK DEBUG]', {
        totalProductsWithStock: productsWithStock.length,
        allLowStockCount: allLowStockProducts.length,
        userLowStockCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.map(p => ({
          name: p.name,
          quantity_current: p.quantity_current,
          quantity_min: p.quantity_min,
          quantity_max: p.quantity_max,
        })),
      });
      
      // Récupérer toutes les ventes de l'utilisateur une seule fois pour éviter les appels répétés
      const allSalesData = await databaseService.getAll('sales');
      const userSales = allSalesData.filter((s: any) => s.user_id === currentUser.uid);
      
      // Dates de référence pour les calculs
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Récupérer les ventes du jour (aujourd'hui) en comparant uniquement la partie date
      const todaySales = userSales.filter((s: any) => {
        const saleDate = new Date(s.sale_date);
        const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
        return saleDateOnly.getTime() === todayStart.getTime();
      });
      
      // Calculer les ventes de cette semaine (7 derniers jours)
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(thisWeekStart.getDate() - 6);
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisWeekEnd = new Date(now);
      thisWeekEnd.setHours(23, 59, 59, 999);
      
      const thisWeekSales = userSales.filter((s: any) => {
        const saleDate = new Date(s.sale_date);
        return saleDate >= thisWeekStart && saleDate <= thisWeekEnd;
      });
      
      // Récupérer les ventes de la semaine dernière pour la croissance
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(lastWeekStart.getDate() - 13);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
      lastWeekEnd.setHours(23, 59, 59, 999);
      
      const lastWeekSales = userSales.filter((s: any) => {
        const saleDate = new Date(s.sale_date);
        return saleDate >= lastWeekStart && saleDate <= lastWeekEnd;
      });
      
      // Récupérer les ventes des 7 derniers jours pour le graphique
      const weeklySales: number[] = [];
      const labels: string[] = [];
      const dayMap = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // commence par Dimanche pour aligner getDay()
      
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Comparer les dates en utilisant uniquement la partie date (année, mois, jour)
        const daySales = userSales.filter((s: any) => {
          const saleDate = new Date(s.sale_date);
          
          // Normaliser les dates pour comparaison (année, mois, jour uniquement)
          const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
          const dayStartOnly = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate());
          
          return saleDateOnly.getTime() === dayStartOnly.getTime();
        });
        
        const dayTotal = daySales.reduce((sum: number, sale: any) => sum + (Number(sale.total_amount) || 0), 0);
        weeklySales.push(dayTotal);
        labels.push(dayMap[dayStart.getDay()]);
        
        // Log pour debug
        if (daySales.length > 0) {
          console.log(`📊 [GRAPH] Jour ${i} jours en arrière (${dayStart.toLocaleDateString('fr-FR')}): ${daySales.length} ventes, ${dayTotal} FCFA`);
        }
      }
      
      console.log('📊 [GRAPH] Données graphique:', { weeklySales, labels });
      
      // Récupérer les clients
      const allCustomers = await databaseService.getAll('customers');
      const customers = allCustomers.filter((c: any) => c.created_by === currentUser.uid);
      
      // Les ventes de l'utilisateur sont déjà récupérées ci-dessus (réutiliser)
      // Si pas encore récupérées, les récupérer maintenant
      const allSales = userSales || allSalesData.filter((s: any) => s.user_id === currentUser.uid);
      
      const allStockData = await databaseService.getAll('stock');
      const allStock = allStockData.filter((s: any) => s.created_by === currentUser.uid);
      
      // Calculer les métriques
      const totalSalesAmount: number = todaySales.reduce((sum: number, sale: any) => sum + (Number(sale.total_amount) || 0), 0);
      const thisWeekSalesAmount: number = thisWeekSales.reduce((sum: number, sale: any) => sum + (Number(sale.total_amount) || 0), 0);
      const lastWeekSalesAmount: number = lastWeekSales.reduce((sum: number, sale: any) => sum + (Number(sale.total_amount) || 0), 0);
      
      console.log('📊 [DASHBOARD DEBUG] Ventes aujourd\'hui:', {
        count: todaySales.length,
        total: totalSalesAmount,
        sales: todaySales.map((s: any) => ({ id: s.id, amount: s.total_amount, date: s.sale_date, user_id: s.user_id })),
      });
      console.log('📊 [DASHBOARD DEBUG] Ventes cette semaine:', {
        count: thisWeekSales.length,
        total: thisWeekSalesAmount,
      });
      console.log('📊 [DASHBOARD DEBUG] Ventes semaine dernière:', {
        count: lastWeekSales.length,
        total: lastWeekSalesAmount,
      });
      
      // Croissance hebdomadaire : comparer cette semaine avec la semaine dernière
      const weeklyGrowth = lastWeekSalesAmount > 0 
        ? ((thisWeekSalesAmount - lastWeekSalesAmount) / lastWeekSalesAmount) * 100 
        : (thisWeekSalesAmount > 0 ? 100 : 0); // Si pas de ventes la semaine dernière mais des ventes cette semaine = 100% croissance
      
      // Calculer le taux de rotation du stock
      // Le taux de rotation = nombre de fois que le stock se renouvelle sur une période
      // Récupérer les items de vente pour cette semaine pour avoir les vraies quantités
      const allSaleItems = await databaseService.getAll('sale_items');
      const thisWeekSaleIds = new Set(thisWeekSales.map((s: any) => s.id));
      
      console.log('📊 [ROTATION] Debug initial:', {
        allSaleItemsCount: allSaleItems.length,
        thisWeekSalesCount: thisWeekSales.length,
        thisWeekSaleIds: Array.from(thisWeekSaleIds),
      });
      
      const thisWeekItems = allSaleItems.filter((item: any) => {
        const matches = thisWeekSaleIds.has(item.sale_id);
        if (matches) {
          console.log('📊 [ROTATION] Item trouvé:', { sale_id: item.sale_id, quantity: item.quantity });
        }
        return matches;
      });
      
      console.log('📊 [ROTATION] Items cette semaine:', thisWeekItems.length);
      
      // Calculer le total des unités vendues cette semaine
      const totalUnitsSoldThisWeek = thisWeekItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      
      // Calculer le stock moyen (stock total actuel)
      const totalStock = allStock.reduce((sum: number, item: any) => sum + (item.quantity_current || 0), 0);
      
      console.log('📊 [ROTATION] Calculs:', {
        totalUnitsSoldThisWeek,
        totalStock,
        thisWeekSalesAmount,
      });
      
      // Taux de rotation basé sur les ventes mensuelles projetées
      // Si on vend X unités par semaine, on vend environ 4X par mois
      // Rotation mensuelle = (unités vendues par mois) / stock moyen
      let rotation = 0;
      if (totalStock > 0 && totalUnitsSoldThisWeek > 0) {
        // Projection mensuelle (4 semaines)
        const monthlyUnitsSold = totalUnitsSoldThisWeek * 4;
        // Rotation mensuelle en pourcentage
        const monthlyRotation = (monthlyUnitsSold / totalStock) * 100;
        // Afficher la rotation mensuelle, limitée à 100%
        rotation = Math.min(100, Math.max(0, monthlyRotation));
        
        console.log('📊 [ROTATION DEBUG] Calcul réussi:', {
          totalUnitsSoldThisWeek,
          monthlyUnitsSold: `${monthlyUnitsSold.toFixed(0)} (projeté)`,
          totalStock,
          monthlyRotation: `${monthlyRotation.toFixed(2)}%`,
          displayRotation: `${rotation.toFixed(1)}%`,
        });
      } else if (totalStock === 0 && thisWeekSalesAmount > 0) {
        // Si pas de stock mais des ventes, afficher un indicateur positif
        rotation = 5; // Indicateur faible mais positif
        console.log('📊 [ROTATION] Pas de stock mais des ventes, rotation = 5%');
      } else if (totalStock > 0 && totalUnitsSoldThisWeek === 0) {
        // Si du stock mais pas de ventes en quantités, utiliser une estimation basée sur le montant
        console.log('📊 [ROTATION] Pas de sale_items trouvés, estimation par prix moyen');
        
        // Estimation par prix moyen si pas de sale_items
        const averagePrice = productsWithStock.length > 0 && productsWithStock.some(p => p.price_sell > 0)
          ? productsWithStock
              .filter(p => p.price_sell > 0)
              .reduce((sum, p) => sum + (p.price_sell || 0), 0) / productsWithStock.filter(p => p.price_sell > 0).length
          : 1;
        
        const estimatedUnitsSold = averagePrice > 0 ? thisWeekSalesAmount / averagePrice : 0;
        const monthlyUnitsSold = estimatedUnitsSold * 4;
        const monthlyRotation = (monthlyUnitsSold / totalStock) * 100;
        rotation = Math.min(100, Math.max(0, monthlyRotation));
        
        console.log('📊 [ROTATION DEBUG] Estimation par prix:', {
          averagePrice,
          estimatedUnitsSold,
          monthlyUnitsSold: `${monthlyUnitsSold.toFixed(0)} (projeté)`,
          totalStock,
          monthlyRotation: `${monthlyRotation.toFixed(2)}%`,
          displayRotation: `${rotation.toFixed(1)}%`,
        });
      } else {
        console.log('📊 [ROTATION] Aucune condition remplie, rotation = 0');
      }
      
      // Créer les activités récentes
      const activities: any[] = [];
      
      // Ajouter les ventes récentes (dernières 3)
      const recentSales = [...allSales]
        .sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
        .slice(0, 3);
      
      recentSales.forEach((sale: any) => {
        activities.push({
          id: `sale-${sale.id}`,
          action: 'Nouvelle vente',
          details: `${sale.total_amount.toLocaleString()} FCFA`,
          time: getTimeAgo(sale.sale_date),
          type: 'success',
        });
      });
      
      // Ajouter les alertes de stock faible
      lowStockProducts.slice(0, 2).forEach(product => {
        activities.push({
          id: `stock-${product.id}`,
          action: 'Alerte stock',
          details: `${product.name} - Stock faible`,
          time: 'Maintenant',
          type: 'warning',
        });
      });
      
      // Ajouter les nouveaux clients (derniers 2)
      const recentCustomers = [...customers]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);
      
      recentCustomers.forEach((customer: any) => {
        activities.push({
          id: `customer-${customer.id}`,
          action: 'Nouveau client',
          details: `${customer.first_name} ${customer.last_name} ajouté`,
          time: getTimeAgo(customer.created_at),
          type: 'success',
        });
      });
      
      // Trier par date (les plus récents en premier)
      activities.sort((a, b) => {
        if (a.time === 'Maintenant') return -1;
        if (b.time === 'Maintenant') return 1;
        return 0;
      });
      
      const metrics = {
        totalProducts: productsWithStock.length,
        lowStockCount: lowStockProducts.length,
        totalSales: totalSalesAmount,
        activeCustomers: customers.length,
        todaySales: todaySales.length,
        weeklyGrowth: parseFloat(weeklyGrowth.toFixed(1)),
      };
      
      console.log('📊 [DASHBOARD] Métriques calculées pour', currentUser.email, ':', {
        totalProducts: `${metrics.totalProducts} produits`,
        lowStock: `${metrics.lowStockCount} alertes`,
        totalSales: `${metrics.totalSales} FCFA`,
        customers: `${metrics.activeCustomers} clients`,
        todaySales: `${metrics.todaySales} ventes aujourd'hui`,
        weeklyGrowth: `${metrics.weeklyGrowth}%`,
        rotationRate: `${rotation}%`,
      });
      
      setDashboardMetrics(metrics);
      setRecentActivities(activities.slice(0, 4));
      setWeeklySalesData(weeklySales);
      setWeeklyLabels(labels);
      setStockRotationRate(parseFloat(rotation.toFixed(0)));
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
    }
  };
  
  // Fonction pour calculer le temps écoulé
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  };

  // Fonction pour charger l'historique complet des activités
  const loadHistoryActivities = async () => {
    try {
      setLoadingHistory(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.warn('⚠️ [HISTORY] Aucun utilisateur connecté');
        return;
      }

      console.log('📊 [HISTORY] Chargement historique pour:', currentUser.email);
      
      const activities: any[] = [];

      // 1. Ventes
      const allSales = await databaseService.getAll('sales');
      const userSales = allSales.filter((s: any) => s.user_id === currentUser.uid || s.created_by === currentUser.uid);
      
      userSales.forEach((sale: any) => {
        activities.push({
          id: `sale-${sale.id}`,
          type: 'sale',
          action: 'Vente effectuée',
          details: `${sale.total_amount.toLocaleString()} FCFA`,
          description: `Vente de ${sale.total_amount.toLocaleString()} FCFA`,
          date: sale.sale_date || sale.created_at,
          icon: 'cart',
          color: '#34C759',
        });
      });

      // 2. Remboursements
      const allRefunds = await databaseService.getAll('refunds');
      const userRefunds = allRefunds.filter((r: any) => r.user_id === currentUser.uid || r.created_by === currentUser.uid);
      
      userRefunds.forEach((refund: any) => {
        activities.push({
          id: `refund-${refund.id}`,
          type: 'refund',
          action: 'Remboursement effectué',
          details: `${refund.total_amount.toLocaleString()} FCFA`,
          description: `Remboursement de ${refund.total_amount.toLocaleString()} FCFA`,
          date: refund.refund_date || refund.created_at,
          icon: 'arrow-undo',
          color: '#FF3B30',
        });
      });

      // 3. Produits créés
      const allProducts = await databaseService.getAll('products');
      const userProducts = allProducts.filter((p: any) => p.created_by === currentUser.uid);
      
      userProducts.forEach((product: any) => {
        activities.push({
          id: `product-${product.id}`,
          type: 'product',
          action: 'Produit créé',
          details: product.name,
          description: `Produit "${product.name}" ajouté`,
          date: product.created_at,
          icon: 'cube',
          color: '#007AFF',
        });
      });

      // 4. Clients créés
      const allCustomers = await databaseService.getAll('customers');
      const userCustomers = allCustomers.filter((c: any) => c.created_by === currentUser.uid);
      
      userCustomers.forEach((customer: any) => {
        activities.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          action: 'Client créé',
          details: customer.name,
          description: `Client "${customer.name}" ajouté`,
          date: customer.created_at,
          icon: 'person',
          color: '#5856D6',
        });
      });

      // 5. Mouvements de stock (approvisionnements et ventes)
      const allStock = await databaseService.getAll('stock');
      const userStock = allStock.filter((s: any) => s.created_by === currentUser.uid);
      
      userStock.forEach((stock: any) => {
        if (stock.last_movement_date && stock.last_movement_type) {
          const movementType = stock.last_movement_type === 'sale' ? 'Vente' : 
                              stock.last_movement_type === 'restock' ? 'Réapprovisionnement' :
                              stock.last_movement_type === 'refund' ? 'Remboursement' : 'Mouvement';
          
          activities.push({
            id: `stock-${stock.id}-${stock.last_movement_date}`,
            type: 'stock',
            action: movementType,
            details: `${stock.product_name || 'Produit'} - ${stock.quantity_current} unités`,
            description: `${movementType} de ${stock.product_name || 'produit'}`,
            date: stock.last_movement_date,
            icon: 'layers',
            color: stock.last_movement_type === 'sale' ? '#FF9500' : '#5AC8FA',
          });
        }
      });

      // Trier par date (les plus récents en premier)
      activities.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });

      console.log(`📊 [HISTORY] ${activities.length} activités trouvées pour ${currentUser.email}`);
      
      setHistoryActivities(activities);
    } catch (error) {
      console.error('❌ [HISTORY] Erreur chargement historique:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const quickActions = [
    {
      id: '1',
      title: 'Articles Total',
      subtitle: `${dashboardMetrics.totalProducts} articles`,
      iconType: 'mc',
      iconName: 'cube-outline',
      color: '#007AFF',
    },
    {
      id: '2',
      title: 'Stock Faible',
      subtitle: `${dashboardMetrics.lowStockCount} produits à réapprovisionner`,
      iconType: 'ion',
      iconName: 'warning-outline',
      color: '#FF9500',
    },
    {
      id: '3',
      title: 'Ventes Aujourd\'hui',
      subtitle: `${dashboardMetrics.todaySales} ventes - ${dashboardMetrics.totalSales.toLocaleString()} FCFA`,
      iconType: 'mc',
      iconName: 'cash-multiple',
      color: '#34C759',
    },
    {
      id: '4',
      title: 'Clients Actifs',
      subtitle: `${dashboardMetrics.activeCustomers} clients enregistrés`,
      iconType: 'ion',
      iconName: 'people-outline',
      color: '#AF52DE',
    },
  ];


  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return '#34C759';
      case 'warning': return '#FF9500';
      case 'info': return '#007AFF';
      default: return '#8E8E93';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header moderne */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.headerIconBadge}
            onPress={loadDashboardMetrics}
          >
            {/* <Ionicons name="home-outline" size={18} color="#fff" /> */}
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerActionBtn}
              onPress={() => {
                setShowHistoryModal(true);
                loadHistoryActivities();
              }}
            >
              <Ionicons name="notifications-outline" size={20} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.welcomeText}>Bienvenue </Text>
        <Text style={styles.subtitle}>Aperçu rapide de votre activité</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
          style={styles.statsScroll}
        >
          {quickActions.map((action) => (
            <View key={action.id} style={styles.statPill}>
              <View style={[styles.pillIconWrap, { backgroundColor: action.color }]}>
                {'iconType' in action && (action as any).iconType === 'ion' ? (
                  <Ionicons name={(action as any).iconName} size={18} color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={(action as any).iconName} size={18} color="#fff" />
                )}
              </View>
              <View style={styles.pillTexts}>
                <Text style={styles.pillTitle}>{action.title}</Text>
                <Text style={styles.pillSubtitle}>{action.subtitle}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Activités Récentes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activités Récentes</Text>
        <View style={styles.activitiesContainer}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: getActivityColor(activity.type) }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <Text style={styles.activityDetails}>{activity.details}</Text>
                </View>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivities}>
              <Text style={styles.emptyActivitiesText}>Aucune activité récente</Text>
            </View>
          )}
        </View>
      </View>

      {/* Cartes métriques */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performances</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E8F1FF' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.metricTitle}>Croissance Hebdomadaire</Text>
            <Text style={styles.metricValue}>
              {dashboardMetrics.weeklyGrowth >= 0 ? '+' : ''}{dashboardMetrics.weeklyGrowth}%
            </Text>
            <Text style={styles.metricSubtitle}>vs semaine dernière</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E9FBF0' }]}>
              <MaterialCommunityIcons name="repeat" size={20} color="#34C759" />
            </View>
            <Text style={styles.metricTitle}>Taux de Rotation</Text>
            <Text style={styles.metricValue}>{stockRotationRate}%</Text>
            <Text style={styles.metricSubtitle}>Stock efficace</Text>
          </View>
        </View>
      </View>

      {/* Graphique barres réelles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Évolution des Ventes</Text>
        <View style={styles.chartContainer}>
          <BarChart data={weeklySalesData} labels={weeklyLabels} />
        </View>
      </View>

      {/* Actions Rapides */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={[styles.quickActionButton, styles.primaryButton]}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Ajouter Article</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionButton, styles.secondaryButton]}>
            <MaterialCommunityIcons name="chart-line" size={18} color="#007AFF" />
            <Text style={styles.buttonTextSecondary}>Voir Statistiques</Text>
          </TouchableOpacity>
        </View>
      </View> */}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </Text>
      </View>

      {/* Modal Historique */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalContainer}>
          <View style={styles.historyModalHeader}>
            <TouchableOpacity
              style={styles.historyModalCloseButton}
              onPress={() => setShowHistoryModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.historyModalTitle}>Historique</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingHistory ? (
            <View style={styles.historyLoadingContainer}>
              <Text style={styles.historyLoadingText}>Chargement...</Text>
            </View>
          ) : historyActivities.length === 0 ? (
            <View style={styles.historyEmptyContainer}>
              <Ionicons name="time-outline" size={64} color="#C0C0C0" />
              <Text style={styles.historyEmptyTitle}>Aucun historique</Text>
              <Text style={styles.historyEmptySubtitle}>
                Vos activités apparaîtront ici
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.historyContent}
              contentContainerStyle={styles.historyContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {historyActivities.map((activity, index) => {
                // Grouper par date
                const activityDate = new Date(activity.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
                
                const isToday = activityDateOnly.getTime() === today.getTime();
                const isYesterday = activityDateOnly.getTime() === new Date(today.getTime() - 86400000).getTime();
                
                let dateLabel = '';
                if (isToday) {
                  dateLabel = "Aujourd'hui";
                } else if (isYesterday) {
                  dateLabel = 'Hier';
                } else {
                  dateLabel = activityDate.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  });
                }

                // Afficher le label de date seulement si c'est la première activité du jour
                const prevActivity = index > 0 ? historyActivities[index - 1] : null;
                const prevActivityDate = prevActivity ? new Date(prevActivity.date) : null;
                const prevActivityDateOnly = prevActivityDate ? new Date(prevActivityDate.getFullYear(), prevActivityDate.getMonth(), prevActivityDate.getDate()) : null;
                const showDateLabel = !prevActivityDateOnly || activityDateOnly.getTime() !== prevActivityDateOnly.getTime();

                return (
                  <View key={activity.id}>
                    {showDateLabel && (
                      <View style={styles.historyDateSeparator}>
                        <Text style={styles.historyDateText}>{dateLabel}</Text>
                      </View>
                    )}
                    <View style={styles.historyItem}>
                      <View style={[styles.historyIconContainer, { backgroundColor: `${activity.color}20` }]}>
                        <Ionicons name={activity.icon} size={20} color={activity.color} />
                      </View>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemAction}>{activity.action}</Text>
                        <Text style={styles.historyItemDetails}>{activity.details}</Text>
                        <Text style={styles.historyItemTime}>
                          {activityDate.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

// Composant BarChart minimaliste sans dépendances externes
function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const maxValue = Math.max(...data, 1);
  return (
    <View>
      {/* Axe Y graduations */}
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartHeaderText}>FCFA</Text>
        <Text style={styles.chartHeaderMax}>{maxValue.toLocaleString()}</Text>
      </View>
      <View style={styles.chartBars}>
        {data.map((value, idx) => {
          const height = Math.max(10, (value / maxValue) * 100);
          const isActive = value > 0;
          return (
            <View key={idx} style={styles.chartBarWrap}>
              <View
                style={[
                  styles.chartBar,
                  { height, backgroundColor: isActive ? '#007AFF' : '#E6EAF2' },
                ]}
              />
              <Text style={styles.chartLabel}>{labels[idx] ?? ''}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerWrapper: {
    padding: 20,
    paddingTop: 50,
    marginTop: -50,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {},
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statsScroll: {
    marginTop: 10,
  },
  statsScrollContent: {
    paddingRight: 12,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pillIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pillTexts: {},
  pillTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  pillSubtitle: {
    fontSize: 11,
    color: '#666',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  activitiesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  activityDetails: {
    fontSize: 12,
    color: '#666',
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
  },
  quickActionsContainer: {
    gap: 12,
    flexDirection: 'row',
  },
  quickActionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    width: '100%',
    paddingHorizontal: 10,
  },
  chartBarWrap: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: 14,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  chartHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#666',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chartHeaderText: {
    fontSize: 12,
    color: '#999',
  },
  chartHeaderMax: {
    fontSize: 12,
    color: '#999',
  },
  emptyActivities: {
    padding: 20,
    alignItems: 'center',
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  // Styles pour le modal d'historique
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  historyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyModalCloseButton: {
    padding: 8,
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  historyLoadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  historyEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  historyEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  historyEmptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  historyContent: {
    flex: 1,
  },
  historyContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  historyDateSeparator: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  historyItemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyItemTime: {
    fontSize: 12,
    color: '#999',
  },
});
