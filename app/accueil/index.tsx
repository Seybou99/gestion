import React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Écran d'Accueil - Dashboard Principal
 * 
 * Affiche les informations principales et les raccourcis
 * vers les différentes sections de l'application.
 */
export default function AccueilScreen() {
  const quickActions = [
    {
      id: '1',
      title: 'Nouveaux Articles',
      subtitle: '12 articles ajoutés',
      icon: '📦',
      color: '#007AFF',
    },
    {
      id: '2',
      title: 'Stock Faible',
      subtitle: '5 produits à réapprovisionner',
      icon: '⚠️',
      color: '#FF9500',
    },
    {
      id: '3',
      title: 'Ventes du Jour',
      subtitle: '1,247€ de chiffre d\'affaires',
      icon: '💰',
      color: '#34C759',
    },
    {
      id: '4',
      title: 'Clients Actifs',
      subtitle: '23 nouveaux clients',
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
});
