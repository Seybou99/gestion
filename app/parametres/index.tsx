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
import { CompleteSyncButton } from '../../components/CompleteSyncButton';
import { NetworkTestButton } from '../../components/NetworkTestButton';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Écran Paramètres - Configuration de l'application
 * 
 * Contient les paramètres de l'application, préférences utilisateur,
 * et options de configuration.
 */
export default function ParametresScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState(true);

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
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
            }
          }
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Réinitialiser les paramètres',
      'Cette action remettra tous les paramètres à leurs valeurs par défaut. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réinitialiser', 
          style: 'destructive', 
          onPress: () => {
            setNotificationsEnabled(true);
            setDarkModeEnabled(false);
            setAutoSyncEnabled(true);
            setSoundEnabled(true);
            setVibrationEnabled(true);
            Alert.alert('Succès', 'Paramètres réinitialisés');
          }
        },
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
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    onPress: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          {typeof icon === 'string' ? <Text style={styles.settingIcon}>{icon}</Text> : icon}
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {rightElement || <Text style={styles.settingArrow}>›</Text>}
    </TouchableOpacity>
  );

  const renderSwitchItem = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          {typeof icon === 'string' ? <Text style={styles.settingIcon}>{icon}</Text> : icon}
        </View>
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
        <Text style={styles.title}>Paramètres</Text>
        <Text style={styles.subtitle}>Configurez votre application</Text>
      </View>

      {/* Profil utilisateur */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>⚙️</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : 'Utilisateur'
            }
          </Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
        </View>
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
            '🔊',
            'Sons',
            'Activer les sons de l\'application',
            soundEnabled,
            setSoundEnabled
          )}
          {renderSwitchItem(
            '📳',
            'Vibrations',
            'Activer les vibrations',
            vibrationEnabled,
            setVibrationEnabled
          )}
        </>
      ))}

      {/* Synchronisation */}
      {renderSettingsSection('Synchronisation', (
        <View style={styles.syncSection}>
          {renderSwitchItem(
            '🔄',
            'Synchronisation automatique',
            'Synchroniser les données en arrière-plan',
            autoSyncEnabled,
            setAutoSyncEnabled
          )}
          {renderSettingItem(
            '📡',
            'Fréquence de synchronisation',
            'Choisir la fréquence de sync',
            () => Alert.alert('Fréquence', 'Options de fréquence à implémenter')
          )}
          {renderSettingItem(
            '📊',
            'Données hors ligne',
            'Gérer le cache local',
            () => Alert.alert('Cache', 'Gestion du cache à implémenter')
          )}
          
          {/* Boutons de synchronisation */}
          <View style={styles.syncButtonsContainer}>
            <NetworkTestButton style={styles.syncButton} />
            <CompleteSyncButton style={styles.syncButton} />
          </View>
        </View>
      ))}

      {/* Interface */}
      {renderSettingsSection('Interface', (
        <>
          {renderSettingItem(
            '🎨',
            'Thème de l\'application',
            'Personnaliser l\'apparence',
            () => Alert.alert('Thème', 'Sélecteur de thème à implémenter')
          )}
          {renderSettingItem(
            '📱',
            'Taille du texte',
            'Ajuster la taille des polices',
            () => Alert.alert('Texte', 'Réglage de la taille à implémenter')
          )}
          {renderSettingItem(
            '🌍',
            'Langue',
            'Choisir la langue de l\'application',
            () => Alert.alert('Langue', 'Sélecteur de langue à implémenter')
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
            () => Alert.alert('Mot de passe', 'Changement de mot de passe à implémenter')
          )}
          {renderSettingItem(
            '🔑',
            'Authentification à deux facteurs',
            'Activer la 2FA',
            () => Alert.alert('2FA', 'Configuration 2FA à implémenter')
          )}
          {renderSettingItem(
            '📱',
            'Appareils connectés',
            'Gérer les appareils autorisés',
            () => Alert.alert('Appareils', 'Gestion des appareils à implémenter')
          )}
        </>
      ))}

      {/* Actions importantes */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
          <Text style={styles.resetButtonText}>Réinitialiser les paramètres</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Version 1.0.0 • Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
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
  settingIconContainer: {
    marginRight: 16,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIcon: {
    fontSize: 24,
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
    gap: 12,
  },
  resetButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  syncSection: {
    gap: 8,
  },
  syncButtonsContainer: {
    marginTop: 16,
    gap: 8,
  },
  syncButton: {
    marginVertical: 4,
  },
});
