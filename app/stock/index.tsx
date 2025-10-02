import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Écran Stock - Gestion du Stock
 * 
 * Affiche l'état du stock avec alertes, réapprovisionnements
 * et historique des mouvements.
 */
export default function StockScreen() {
  const [selectedFilter, setSelectedFilter] = useState('Tous');

  // Données fictives du stock
  const stockData = [
    {
      id: '1',
      name: 'iPhone 15 Pro',
      currentStock: 12,
      minStock: 5,
      maxStock: 50,
      status: 'Normal',
      lastMovement: '2024-01-15',
      movement: '+3',
      category: 'Smartphones',
      supplier: 'Apple Inc.',
      cost: 999,
      sellingPrice: 1299,
    },
    {
      id: '2',
      name: 'MacBook Air M3',
      currentStock: 8,
      minStock: 3,
      maxStock: 25,
      status: 'Normal',
      lastMovement: '2024-01-14',
      movement: '+2',
      category: 'Ordinateurs',
      supplier: 'Apple Inc.',
      cost: 1199,
      sellingPrice: 1499,
    },
    {
      id: '3',
      name: 'AirPods Pro 2',
      currentStock: 0,
      minStock: 10,
      maxStock: 100,
      status: 'Rupture',
      lastMovement: '2024-01-10',
      movement: '-5',
      category: 'Audio',
      supplier: 'Apple Inc.',
      cost: 199,
      sellingPrice: 279,
    },
    {
      id: '4',
      name: 'iPad Air',
      currentStock: 3,
      minStock: 5,
      maxStock: 30,
      status: 'Stock faible',
      lastMovement: '2024-01-12',
      movement: '-2',
      category: 'Tablettes',
      supplier: 'Apple Inc.',
      cost: 499,
      sellingPrice: 649,
    },
    {
      id: '5',
      name: 'Apple Watch Series 9',
      currentStock: 15,
      minStock: 8,
      maxStock: 40,
      status: 'Normal',
      lastMovement: '2024-01-13',
      movement: '+4',
      category: 'Montres',
      supplier: 'Apple Inc.',
      cost: 349,
      sellingPrice: 449,
    },
    {
      id: '6',
      name: 'Magic Mouse',
      currentStock: 22,
      minStock: 15,
      maxStock: 80,
      status: 'Normal',
      lastMovement: '2024-01-11',
      movement: '+8',
      category: 'Accessoires',
      supplier: 'Apple Inc.',
      cost: 69,
      sellingPrice: 89,
    },
  ];

  const movements = [
    {
      id: '1',
      product: 'iPhone 15 Pro',
      type: 'Entrée',
      quantity: 3,
      date: '2024-01-15 14:30',
      reason: 'Réapprovisionnement',
      user: 'Admin',
    },
    {
      id: '2',
      product: 'AirPods Pro 2',
      type: 'Sortie',
      quantity: 5,
      date: '2024-01-15 10:15',
      reason: 'Vente',
      user: 'Marie Dubois',
    },
    {
      id: '3',
      product: 'MacBook Air M3',
      type: 'Entrée',
      quantity: 2,
      date: '2024-01-14 16:45',
      reason: 'Réapprovisionnement',
      user: 'Admin',
    },
    {
      id: '4',
      product: 'iPad Air',
      type: 'Sortie',
      quantity: 2,
      date: '2024-01-12 11:20',
      reason: 'Vente',
      user: 'Jean Martin',
    },
  ];

  const filters = ['Tous', 'Stock faible', 'Rupture', 'Normal'];

  const filteredStock = stockData.filter(item => {
    if (selectedFilter === 'Tous') return true;
    return item.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal': return '#34C759';
      case 'Stock faible': return '#FF9500';
      case 'Rupture': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'Normal': return '#E8F5E8';
      case 'Stock faible': return '#FFF4E6';
      case 'Rupture': return '#FFEBEB';
      default: return '#F0F0F0';
    }
  };

  const getMovementColor = (movement: string) => {
    return movement.startsWith('+') ? '#34C759' : '#FF3B30';
  };

  const getStockPercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const renderStockItem = ({ item }: { item: typeof stockData[0] }) => (
    <TouchableOpacity style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockName}>{item.name}</Text>
          <Text style={styles.stockCategory}>{item.category}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBackgroundColor(item.status) },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.stockLevels}>
        <View style={styles.stockBar}>
          <View
            style={[
              styles.stockFill,
              {
                width: `${getStockPercentage(item.currentStock, item.maxStock)}%`,
                backgroundColor: getStatusColor(item.status),
              },
            ]}
          />
        </View>
        <Text style={styles.stockText}>
          {item.currentStock} / {item.maxStock} unités
        </Text>
      </View>

      <View style={styles.stockDetails}>
        <View style={styles.stockDetailItem}>
          <Text style={styles.detailLabel}>Min:</Text>
          <Text style={styles.detailValue}>{item.minStock}</Text>
        </View>
        <View style={styles.stockDetailItem}>
          <Text style={styles.detailLabel}>Dernier mouvement:</Text>
          <Text style={[styles.detailValue, { color: getMovementColor(item.movement) }]}>
            {item.movement}
          </Text>
        </View>
        <View style={styles.stockDetailItem}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{item.lastMovement}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMovement = ({ item }: { item: typeof movements[0] }) => (
    <View style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <Text style={styles.movementProduct}>{item.product}</Text>
        <View
          style={[
            styles.movementType,
            {
              backgroundColor: item.type === 'Entrée' ? '#E8F5E8' : '#FFEBEB',
            },
          ]}
        >
          <Text
            style={[
              styles.movementTypeText,
              {
                color: item.type === 'Entrée' ? '#34C759' : '#FF3B30',
              },
            ]}
          >
            {item.type}
          </Text>
        </View>
      </View>
      
      <View style={styles.movementDetails}>
        <Text style={styles.movementQuantity}>
          {item.type === 'Entrée' ? '+' : '-'}{item.quantity} unités
        </Text>
        <Text style={styles.movementReason}>{item.reason}</Text>
      </View>
      
      <View style={styles.movementFooter}>
        <Text style={styles.movementDate}>{item.date}</Text>
        <Text style={styles.movementUser}>par {item.user}</Text>
      </View>
    </View>
  );

  const renderFilter = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter && styles.filterTextActive,
        ]}
      >
        {filter}
      </Text>
    </TouchableOpacity>
  );

  const getAlertCount = () => {
    return stockData.filter(item => item.status !== 'Normal').length;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stock</Text>
        <Text style={styles.subtitle}>Gestion de l'inventaire</Text>
        
        {getAlertCount() > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>
              ⚠️ {getAlertCount()} produit{getAlertCount() > 1 ? 's' : ''} nécessite{getAlertCount() > 1 ? 'nt' : ''} attention
            </Text>
          </View>
        )}
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map(renderFilter)}
        </ScrollView>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stockData.length}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stockData.filter(item => item.status === 'Stock faible').length}
          </Text>
          <Text style={styles.statLabel}>Stock faible</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stockData.filter(item => item.status === 'Rupture').length}
          </Text>
          <Text style={styles.statLabel}>Ruptures</Text>
        </View>
      </View>

      {/* Liste du stock */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>État du Stock</Text>
        <FlatList
          data={filteredStock}
          renderItem={renderStockItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Mouvements récents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mouvements Récents</Text>
        <FlatList
          data={movements}
          renderItem={renderMovement}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Actions rapides */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📦 Réapprovisionner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={styles.actionButtonTextSecondary}>📊 Rapport Stock</Text>
        </TouchableOpacity>
      </View>

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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  alertBanner: {
    backgroundColor: '#FFF4E6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  alertText: {
    fontSize: 14,
    color: '#B8860B',
    fontWeight: '500',
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  stockCategory: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockLevels: {
    marginBottom: 12,
  },
  stockBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  stockFill: {
    height: '100%',
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  movementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movementProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  movementType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  movementTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  movementDetails: {
    marginBottom: 8,
  },
  movementQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  movementReason: {
    fontSize: 12,
    color: '#666',
  },
  movementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementDate: {
    fontSize: 11,
    color: '#999',
  },
  movementUser: {
    fontSize: 11,
    color: '#999',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#007AFF',
    fontSize: 14,
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
});
