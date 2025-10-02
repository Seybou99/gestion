import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Écran Plus - Paramètres et Fonctionnalités Avancées
 * 
 * Contient les paramètres, informations de l'app,
 * et fonctionnalités supplémentaires.
 */
export default function PlusScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // La redirection se fait automatiquement via le contexte AuthContext
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
            }
          }
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Vider le cache',
      'Cette action supprimera les données temporaires. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: () => console.log('Clear cache') },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Exporter les données',
      'Vos données seront exportées au format CSV.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Exporter', onPress: () => console.log('Export data') },
      ]
    );
  };

  const renderSettingsSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {rightElement || <Text style={styles.settingArrow}>›</Text>}
    </TouchableOpacity>
  );

  const renderSwitchItem = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Plus</Text>
        <Text style={styles.subtitle}>Paramètres et fonctionnalités</Text>
      </View>

      {/* Profil utilisateur */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : 'Utilisateur Connecté'
            }
          </Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            // Navigation vers l'écran de profil
            // Note: Avec Expo Router, la navigation se fait automatiquement
            // quand on clique sur l'onglet "profil" dans la navigation
            console.log('Redirection vers le profil via navigation');
          }}
        >
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Paramètres généraux */}
      {renderSettingsSection('Général', (
        <>
          {renderSwitchItem(
            '🔔',
            'Notifications',
            'Recevoir les notifications push',
            notificationsEnabled,
            setNotificationsEnabled
          )}
          {renderSwitchItem(
            '🌙',
            'Mode sombre',
            'Activer le thème sombre',
            darkModeEnabled,
            setDarkModeEnabled
          )}
          {renderSwitchItem(
            '🔄',
            'Synchronisation automatique',
            'Synchroniser les données en arrière-plan',
            autoSyncEnabled,
            setAutoSyncEnabled
          )}
        </>
      ))}

      {/* Gestion des données */}
      {renderSettingsSection('Données', (
        <>
          {renderSettingItem(
            '📤',
            'Exporter les données',
            'Exporter vos données au format CSV',
            handleExportData
          )}
          {renderSettingItem(
            '🗑️',
            'Vider le cache',
            'Supprimer les données temporaires',
            handleClearCache
          )}
          {renderSettingItem(
            '📊',
            'Statistiques détaillées',
            'Voir les statistiques avancées',
            () => console.log('Statistics')
          )}
        </>
      ))}

      {/* Sécurité */}
      {renderSettingsSection('Sécurité', (
        <>
          {renderSettingItem(
            '🔐',
            'Changer le mot de passe',
            'Modifier votre mot de passe',
            () => console.log('Change password')
          )}
          {renderSettingItem(
            '🔑',
            'Authentification à deux facteurs',
            'Activer la 2FA',
            () => console.log('2FA')
          )}
          {renderSettingItem(
            '📱',
            'Appareils connectés',
            'Gérer les appareils autorisés',
            () => console.log('Devices')
          )}
        </>
      ))}

      {/* Support */}
      {renderSettingsSection('Support', (
        <>
          {renderSettingItem(
            '❓',
            'Centre d\'aide',
            'FAQ et guides d\'utilisation',
            () => console.log('Help')
          )}
          {renderSettingItem(
            '📞',
            'Nous contacter',
            'Support technique et suggestions',
            () => console.log('Contact')
          )}
          {renderSettingItem(
            '⭐',
            'Évaluer l\'application',
            'Donner votre avis sur l\'App Store',
            () => console.log('Rate app')
          )}
        </>
      ))}

      {/* Informations */}
      {renderSettingsSection('Informations', (
        <>
          {renderSettingItem(
            'ℹ️',
            'À propos',
            'Version 1.0.0 - Informations légales',
            () => console.log('About')
          )}
          {renderSettingItem(
            '📋',
            'Conditions d\'utilisation',
            'Lire les CGU',
            () => console.log('Terms')
          )}
          {renderSettingItem(
            '🔒',
            'Politique de confidentialité',
            'Comment nous protégeons vos données',
            () => console.log('Privacy')
          )}
        </>
      ))}

      {/* Actions importantes */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Version 1.0.0 • Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </Text>
        <Text style={styles.footerText}>
          © 2024 Mon Application. Tous droits réservés.
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
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingArrow: {
    fontSize: 18,
    color: '#c0c0c0',
    fontWeight: '300',
  },
  actionsSection: {
    marginTop: 30,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
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
    textAlign: 'center',
    marginBottom: 4,
  },
});
