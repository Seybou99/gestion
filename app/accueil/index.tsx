import { useEffect, useState } from 'react';
import {
    Dimensions,
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
  const [stockRotationRate, setStockRotationRate] = useState(0);

  // Charger les données du dashboard
  useEffect(() => {
    loadDashboardMetrics();
  }, [products]);

  const loadDashboardMetrics = async () => {
    try {
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
      
      // Récupérer les ventes du jour
      const today = new Date().toISOString().split('T')[0];
      const allTodaySales = await databaseService.getSalesByDateRange(today, today);
      const todaySales = allTodaySales.filter(s => s.user_id === currentUser.uid);
      
      // Récupérer les ventes de la semaine dernière pour la croissance
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 14);
      const lastWeekEnd = new Date();
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
      const allLastWeekSales = await databaseService.getSalesByDateRange(
        lastWeekStart.toISOString().split('T')[0],
        lastWeekEnd.toISOString().split('T')[0]
      );
      const lastWeekSales = allLastWeekSales.filter(s => s.user_id === currentUser.uid);
      
      // Récupérer les ventes des 7 derniers jours pour le graphique
      const weeklySales: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const allDaySales = await databaseService.getSalesByDateRange(dateStr, dateStr);
        const daySales = allDaySales.filter(s => s.user_id === currentUser.uid);
        const dayTotal = daySales.reduce((sum, sale) => sum + sale.total_amount, 0);
        weeklySales.push(dayTotal);
      }
      
      // Récupérer les clients
      const allCustomers = await databaseService.getAll('customers');
      const customers = allCustomers.filter((c: any) => c.created_by === currentUser.uid);
      
      // Récupérer toutes les ventes pour les activités récentes
      const allSalesData = await databaseService.getAll('sales');
      const allSales = allSalesData.filter((s: any) => s.user_id === currentUser.uid);
      
      const allStockData = await databaseService.getAll('stock');
      const allStock = allStockData.filter((s: any) => s.created_by === currentUser.uid);
      
      // Calculer les métriques
      const totalSalesAmount = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const lastWeekSalesAmount = lastWeekSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const weeklyGrowth = lastWeekSalesAmount > 0 
        ? ((totalSalesAmount - lastWeekSalesAmount) / lastWeekSalesAmount) * 100 
        : 0;
      
      // Calculer le taux de rotation du stock
      const totalStock = allStock.reduce((sum: number, item: any) => sum + item.quantity_current, 0);
      const rotation = totalStock > 0 ? Math.min(100, (allSales.length / totalStock) * 100) : 0;
      
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
      });
      
      setDashboardMetrics(metrics);
      setRecentActivities(activities.slice(0, 4));
      setWeeklySalesData(weeklySales);
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

  const quickActions = [
    {
      id: '1',
      title: 'Articles Total',
      subtitle: `${dashboardMetrics.totalProducts} articles`,
      icon: '📦',
      color: '#007AFF',
    },
    {
      id: '2',
      title: 'Stock Faible',
      subtitle: `${dashboardMetrics.lowStockCount} produits à réapprovisionner`,
      icon: '⚠️',
      color: '#FF9500',
    },
    {
      id: '3',
      title: 'Ventes Aujourd\'hui',
      subtitle: `${dashboardMetrics.todaySales} ventes - ${dashboardMetrics.totalSales.toLocaleString()} FCFA`,
      icon: '💰',
      color: '#34C759',
    },
    {
      id: '4',
      title: 'Clients Actifs',
      subtitle: `${dashboardMetrics.activeCustomers} clients enregistrés`,
      icon: '👥',
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bonjour ! 👋</Text>
        <Text style={styles.subtitle}>
          Voici un aperçu de votre activité aujourd'hui
        </Text>
      </View>

      {/* Statistiques Rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aperçu Rapide</Text>
        <View style={styles.statsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: action.color }]}>
                <Text style={styles.iconText}>{action.icon}</Text>
              </View>
              <Text style={styles.statTitle}>{action.title}</Text>
              <Text style={styles.statSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activités Récentes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activités Récentes</Text>
        <View style={styles.activitiesContainer}>
          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityEmoji}>
                  {getActivityIcon(activity.type)}
                </Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityDetails}>{activity.details}</Text>
              </View>
              <View style={styles.activityMeta}>
                <Text style={styles.activityTime}>{activity.time}</Text>
                <View
                  style={[
                    styles.activityIndicator,
                    { backgroundColor: getActivityColor(activity.type) },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Métriques Avancées */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performances</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Croissance Hebdomadaire</Text>
            <Text style={styles.metricValue}>+{dashboardMetrics.weeklyGrowth}%</Text>
            <Text style={styles.metricSubtitle}>vs semaine dernière</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Taux de Rotation</Text>
            <Text style={styles.metricValue}>{stockRotationRate}%</Text>
            <Text style={styles.metricSubtitle}>Stock efficace</Text>
          </View>
        </View>
      </View>

      {/* Graphique Simple (Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Évolution des Ventes</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartTitle}>📈 Graphique des Ventes</Text>
            <Text style={styles.chartSubtitle}>
              Ventes des 7 derniers jours
            </Text>
            <View style={styles.chartBars}>
              {weeklySalesData.map((amount, index) => {
                // Normaliser les hauteurs entre 20 et 100
                const maxSale = Math.max(...weeklySalesData, 1);
                const normalizedHeight = maxSale > 0 ? Math.max(20, (amount / maxSale) * 100) : 20;
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.chartBar,
                      { 
                        height: normalizedHeight, 
                        backgroundColor: amount > 0 ? '#007AFF' : '#E0E0E0' 
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Actions Rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={[styles.quickActionButton, styles.primaryButton]}>
            <Text style={styles.buttonText}>➕ Ajouter Article</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionButton, styles.secondaryButton]}>
            <Text style={styles.buttonTextSecondary}>📊 Voir Statistiques</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  activityIcon: {
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 20,
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
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActionsContainer: {
    gap: 12,
  },
  quickActionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
  chartPlaceholder: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    width: '100%',
    paddingHorizontal: 10,
  },
  chartBar: {
    width: 20,
    borderRadius: 4,
    marginHorizontal: 2,
  },
});
