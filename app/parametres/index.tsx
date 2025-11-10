import { router } from 'expo-router';
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
import { CleanFirestoreStockButton } from '../../components/CleanFirestoreStockButton';
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

  const handleResetData = () => {
    Alert.alert(
      'Réinitialiser les données',
      'Cela va supprimer toutes les données locales et les recharger depuis le serveur. Cette action est utile si vous rencontrez des problèmes de synchronisation. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 [RESET] Début de la réinitialisation des données...');
              
              // Importer AsyncStorage
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              
              // Nettoyer AsyncStorage
              await AsyncStorage.multiRemove([
                'products',
                'stock',
                'sales',
                'customers',
                'categories',
                'locations',
                'inventory',
                'sale_items',
                'sync_queue',
                'sync_metadata'
              ]);
              
              // Invalider le cache
              const { databaseService } = await import('../../services/DatabaseService');
              databaseService.invalidateCache();
              
              console.log('✅ [RESET] Données locales supprimées');
              
              Alert.alert(
                'Succès',
                'Données réinitialisées avec succès. Les données vont se recharger depuis le serveur.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Forcer le rechargement en naviguant vers l'accueil
                      router.replace('/accueil');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('❌ [RESET] Erreur:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser les données');
            }
          }
        }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Paramètres généraux */}
      

      {/* Ventes et Rapports */}
      {renderSettingsSection('Ventes et Rapports', (
        <>
          {renderSettingItem(
            '🧾',
            'Historique des ventes',
            'Voir toutes les ventes effectuées',
            () => {
              console.log('🧾 Navigation vers historique des ventes');
              router.push('/parametres/recu');
            }
          )}
          {renderSettingItem(
            '↩️',
            'Remboursements',
            'Voir tous les remboursements effectués',
            () => {
              console.log('↩️ Navigation vers remboursements');
              router.push('/parametres/remboursement');
            }
          )}
          {renderSettingItem(
            '📄',
            'Devis',
            'Gérer tous vos devis',
            () => {
              console.log('📄 Navigation vers devis');
              router.push('/parametres/devis');
            }
          )}
        </>
      ))}

      {/* Gestion */}
      {renderSettingsSection('Gestion', (
        <>
          {renderSettingItem(
            '👤',
            'Profil',
            'Informations de votre compte',
            () => {
              console.log('👤 Navigation vers profil');
              router.push('/parametres/profil');
            }
          )}
          {renderSettingItem(
            '👥',
            'Clients',
            'Gérer tous vos clients',
            () => {
              console.log('👥 Navigation vers clients');
              router.push('/parametres/client');
            }
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingTop: 10,
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
