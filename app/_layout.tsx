import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { appInitializer } from '../services/AppInitializer';
import { persistor, store } from '../store';

// Composant principal de l'application avec authentification
const AppContent: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  // Initialiser l'application au démarrage
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initialisation de l\'application...');
        await appInitializer.initialize();
        setAppInitialized(true);
        console.log('✅ Application initialisée avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        // Continuer même en cas d'erreur pour ne pas bloquer l'app
        setAppInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Afficher un loader pendant l'initialisation ou la vérification de l'authentification
  if (loading || !appInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Si l'utilisateur est connecté, afficher l'interface principale avec navigation
  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <NativeTabs>
          <NativeTabs.Trigger name="accueil">
            <Label>Accueil</Label>
            <Icon sf="house.fill" drawable="custom_android_drawable" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="articles">
            <Label>Articles</Label>
            <Icon sf="square.grid.2x2.fill" drawable="custom_articles_drawable" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="stock">
            <Label>Stock</Label>
            <Icon sf="cube.box.fill" drawable="custom_stock_drawable" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="ventes">
            <Label>Ventes</Label>
            <Icon sf="cart.fill" drawable="custom_sales_drawable" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="profil">
            <Label>Profil</Label>
            <Icon sf="person.circle.fill" drawable="custom_profile_drawable" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="plus">
            <Label>Plus</Label>
            <Icon sf="ellipsis.circle.fill" drawable="custom_plus_drawable" />
          </NativeTabs.Trigger>
        </NativeTabs>
      </View>
    );
  }

  // Sinon, afficher le formulaire de connexion ou d'inscription
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {showRegister ? (
        <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </View>
  );
};

// Composant racine avec les providers
export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={<ActivityIndicator size="large" color="#007AFF" />} persistor={persistor}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  // Note: Le style nativeTabs a été retiré car NativeTabs ne supporte pas
  // la propriété style. Le centrage sera géré par le système natif.
});