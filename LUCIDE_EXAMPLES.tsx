/**
 * 🎨 EXEMPLES D'UTILISATION DES ICÔNES LUCIDE
 * 
 * Ce fichier contient des exemples pratiques d'utilisation
 * des icônes Lucide dans votre application de gestion.
 * 
 * Pour l'utiliser, copiez les exemples dans vos composants.
 */

import {
    AlertTriangle,
    ArrowLeft,
    Barcode,
    // Communication
    Bell,
    CheckCircle,
    ChevronRight,
    Cloud,
    DollarSign,

    // Édition & Gestion
    Edit2,
    Eye,
    Home,
    Info,
    Lock,
    // Commerce & Produits
    Package,
    // Navigation & Actions
    Plus,
    RefreshCw,
    Save,
    ScanBarcode,
    // Recherche & Filtres
    Search,
    Settings,
    ShoppingCart,
    Tag,
    Trash2,
    TrendingDown,
    // Stock & Statut
    TrendingUp,
    // Utilisateurs
    User, Users,
    // Réseau & Sync
    Wifi, WifiOff,
    X,
    XCircle
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// 1. EXEMPLE : EN-TÊTE DE PAGE AVEC ACTIONS
// ============================================================================

export const PageHeaderExample = () => {
  return (
    <View style={styles.header}>
      {/* Titre */}
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => console.log('Back')}>
          <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Articles</Text>
      </View>

      {/* Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconButton}>
          <ScanBarcode size={22} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton}>
          <Search size={22} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton}>
          <Bell size={22} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================================
// 2. EXEMPLE : CARTE DE PRODUIT COMPLÈTE
// ============================================================================

export const ProductCardExample = ({ product }: any) => {
  const getStockIcon = () => {
    if (product.stock === 0) {
      return <XCircle size={18} color="#FF3B30" strokeWidth={2} />;
    } else if (product.stock <= product.minStock) {
      return <AlertTriangle size={18} color="#FF9500" strokeWidth={2} />;
    } else {
      return <CheckCircle size={18} color="#34C759" strokeWidth={2} />;
    }
  };

  return (
    <View style={styles.productCard}>
      {/* En-tête avec icône */}
      <View style={styles.productHeader}>
        <View style={styles.productTitleRow}>
          <Package size={20} color="#007AFF" strokeWidth={2} />
          <Text style={styles.productName}>{product.name}</Text>
        </View>
        
        {/* Badge catégorie */}
        <View style={styles.categoryBadge}>
          <Tag size={14} color="#666" strokeWidth={2} />
          <Text style={styles.categoryText}>{product.category}</Text>
        </View>
      </View>

      {/* Informations */}
      <View style={styles.productInfo}>
        {/* Prix */}
        <View style={styles.infoRow}>
          <DollarSign size={16} color="#666" strokeWidth={2} />
          <Text style={styles.infoText}>{product.price} FCFA</Text>
        </View>

        {/* Stock */}
        <View style={styles.infoRow}>
          {getStockIcon()}
          <Text style={styles.infoText}>{product.stock} unités</Text>
        </View>

        {/* Code-barres */}
        <View style={styles.infoRow}>
          <Barcode size={16} color="#666" strokeWidth={2} />
          <Text style={styles.infoText}>{product.sku}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Eye size={18} color="#007AFF" strokeWidth={2} />
          <Text style={styles.actionText}>Voir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Edit2 size={18} color="#007AFF" strokeWidth={2} />
          <Text style={styles.actionText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Trash2 size={18} color="#FF3B30" strokeWidth={2} />
          <Text style={styles.actionText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================================
// 3. EXEMPLE : INDICATEURS DE STATUT
// ============================================================================

export const StatusIndicatorsExample = () => {
  return (
    <View style={styles.statusContainer}>
      {/* En ligne */}
      <View style={styles.statusBadge}>
        <Wifi size={16} color="#34C759" strokeWidth={2} />
        <Text style={styles.statusText}>En ligne</Text>
      </View>

      {/* Hors ligne */}
      <View style={styles.statusBadge}>
        <WifiOff size={16} color="#FF3B30" strokeWidth={2} />
        <Text style={styles.statusText}>Hors ligne</Text>
      </View>

      {/* Synchronisation */}
      <View style={styles.statusBadge}>
        <RefreshCw size={16} color="#007AFF" strokeWidth={2} />
        <Text style={styles.statusText}>Sync...</Text>
      </View>

      {/* Succès */}
      <View style={styles.statusBadge}>
        <CheckCircle size={16} color="#34C759" strokeWidth={2} />
        <Text style={styles.statusText}>Synchronisé</Text>
      </View>
    </View>
  );
};

// ============================================================================
// 4. EXEMPLE : LISTE D'OPTIONS DE PARAMÈTRES
// ============================================================================

export const SettingsListExample = () => {
  const settingsItems = [
    { icon: User, label: 'Profil', color: '#007AFF' },
    { icon: Bell, label: 'Notifications', color: '#FF9500', badge: 3 },
    { icon: Lock, label: 'Sécurité', color: '#FF3B30' },
    { icon: Cloud, label: 'Synchronisation', color: '#5AC8FA' },
    { icon: Settings, label: 'Paramètres', color: '#8E8E93' },
    { icon: Info, label: 'À propos', color: '#34C759' },
  ];

  return (
    <View style={styles.settingsList}>
      {settingsItems.map((item, index) => (
        <TouchableOpacity key={index} style={styles.settingsItem}>
          <View style={styles.settingsLeft}>
            <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
              <item.icon size={20} color={item.color} strokeWidth={2} />
            </View>
            <Text style={styles.settingsLabel}>{item.label}</Text>
            
            {/* Badge optionnel */}
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          
          <ChevronRight size={20} color="#C7C7CC" strokeWidth={2} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// 5. EXEMPLE : BOUTON D'ACTION FLOTTANT (FAB)
// ============================================================================

export const FABExample = () => {
  return (
    <View>
      {/* FAB Simple */}
      <TouchableOpacity style={styles.fab}>
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* FAB avec label */}
      <TouchableOpacity style={styles.fabExtended}>
        <Plus size={20} color="#fff" strokeWidth={2.5} />
        <Text style={styles.fabLabel}>Ajouter un article</Text>
      </TouchableOpacity>

      {/* FAB multiple */}
      <View style={styles.fabGroup}>
        <TouchableOpacity style={[styles.fabSmall, { backgroundColor: '#34C759' }]}>
          <Package size={18} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.fabSmall, { backgroundColor: '#FF9500' }]}>
          <ShoppingCart size={18} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.fab}>
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================================
// 6. EXEMPLE : STATISTIQUES/DASHBOARD
// ============================================================================

export const DashboardStatsExample = () => {
  const stats = [
    { 
      icon: Package, 
      value: '243', 
      label: 'Produits', 
      color: '#007AFF',
      trend: 'up',
      change: '+12%'
    },
    { 
      icon: ShoppingCart, 
      value: '1,234', 
      label: 'Ventes', 
      color: '#34C759',
      trend: 'up',
      change: '+23%'
    },
    { 
      icon: DollarSign, 
      value: '45K', 
      label: 'Revenus', 
      color: '#FF9500',
      trend: 'down',
      change: '-5%'
    },
    { 
      icon: Users, 
      value: '89', 
      label: 'Clients', 
      color: '#5AC8FA',
      trend: 'up',
      change: '+8%'
    },
  ];

  return (
    <View style={styles.statsGrid}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: `${stat.color}15` }]}>
            <stat.icon size={24} color={stat.color} strokeWidth={2} />
          </View>
          
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
          
          <View style={styles.statTrend}>
            {stat.trend === 'up' ? (
              <TrendingUp size={14} color="#34C759" strokeWidth={2} />
            ) : (
              <TrendingDown size={14} color="#FF3B30" strokeWidth={2} />
            )}
            <Text style={[
              styles.statChange, 
              { color: stat.trend === 'up' ? '#34C759' : '#FF3B30' }
            ]}>
              {stat.change}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// 7. EXEMPLE : FORMULAIRE AVEC ICÔNES
// ============================================================================

export const FormWithIconsExample = () => {
  return (
    <View style={styles.form}>
      {/* Champ avec icône */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Nom du produit</Text>
        <View style={styles.inputWithIcon}>
          <Package size={20} color="#999" strokeWidth={2} />
          <Text style={styles.input}>Nom du produit...</Text>
        </View>
      </View>

      {/* Champ prix */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Prix de vente</Text>
        <View style={styles.inputWithIcon}>
          <DollarSign size={20} color="#999" strokeWidth={2} />
          <Text style={styles.input}>0</Text>
        </View>
      </View>

      {/* Champ catégorie */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Catégorie</Text>
        <View style={styles.inputWithIcon}>
          <Tag size={20} color="#999" strokeWidth={2} />
          <Text style={styles.input}>Sélectionner...</Text>
          <ChevronRight size={20} color="#999" strokeWidth={2} />
        </View>
      </View>

      {/* Boutons */}
      <View style={styles.formButtons}>
        <TouchableOpacity style={styles.buttonSecondary}>
          <X size={18} color="#666" strokeWidth={2} />
          <Text style={styles.buttonSecondaryText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonPrimary}>
          <Save size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.buttonPrimaryText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================================
// 8. EXEMPLE : BARRE D'ONGLETS
// ============================================================================

export const TabBarExample = () => {
  const tabs = [
    { icon: Home, label: 'Accueil', isActive: true },
    { icon: Package, label: 'Articles', isActive: false },
    { icon: ShoppingCart, label: 'Ventes', isActive: false, badge: 5 },
    { icon: User, label: 'Profil', isActive: false },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => (
        <TouchableOpacity key={index} style={styles.tab}>
          <View style={styles.tabIconContainer}>
            <tab.icon 
              size={24} 
              color={tab.isActive ? '#007AFF' : '#8E8E93'} 
              strokeWidth={2}
            />
            {tab.badge && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabLabel, 
            { color: tab.isActive ? '#007AFF' : '#8E8E93' }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // En-tête
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },

  // Carte produit
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  productInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
  },

  // Statuts
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Paramètres
  settingsList: {
    backgroundColor: '#fff',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabExtended: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fabGroup: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 12,
    alignItems: 'flex-end',
  },
  fabSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Statistiques
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Formulaire
  form: {
    padding: 16,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buttonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Barre d'onglets
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});


