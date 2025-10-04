import React, { useEffect, useState } from 'react';
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

  // Charger les données du dashboard
  useEffect(() => {
    loadDashboardMetrics();
  }, [products]);

  const loadDashboardMetrics = async () => {
    try {
      // Récupérer les produits avec stock
      const productsWithStock = await databaseService.getProductsWithStock();
      const lowStockProducts = await databaseService.getLowStockProducts();
      
      // Récupérer les ventes du jour
      const today = new Date().toISOString().split('T')[0];
      const todaySales = await databaseService.getSalesByDateRange(today, today);
      
      // Récupérer les clients
      const customers = await databaseService.getAll('customers');
      
      // Calculer les métriques
      const totalSalesAmount = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
      
      setDashboardMetrics({
        totalProducts: productsWithStock.length,
        lowStockCount: lowStockProducts.length,
        totalSales: totalSalesAmount,
        activeCustomers: customers.length,
        todaySales: todaySales.length,
        weeklyGrowth: 12.5, // Simulation pour l'instant
      });
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
    }
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

  const recentActivities = [
    {
      id: '1',
      action: 'Nouvelle vente',
      details: 'iPhone 15 Pro - 1,299€',
      time: 'Il y a 5 minutes',
      type: 'success',
    },
    {
      id: '2',
      action: 'Stock mis à jour',
      details: 'MacBook Air - Quantité: 15',
      time: 'Il y a 12 minutes',
      type: 'info',
    },
    {
      id: '3',
      action: 'Nouveau client',
      details: 'Marie Dubois ajoutée',
      time: 'Il y a 25 minutes',
      type: 'success',
    },
    {
      id: '4',
      action: 'Alerte stock',
      details: 'AirPods Pro - Stock faible',
      time: 'Il y a 1 heure',
      type: 'warning',
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
            <Text style={styles.metricValue}>85%</Text>
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
              {[65, 80, 45, 90, 75, 85, 95].map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.chartBar,
                    { height: height, backgroundColor: dashboardMetrics.todaySales > 0 ? '#007AFF' : '#E0E0E0' }
                  ]}
                />
              ))}
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
