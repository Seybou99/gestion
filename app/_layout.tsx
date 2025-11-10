import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { HapticTab } from '@/components/HapticTab';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { appInitializer } from '@/services/AppInitializer';
import { persistor, store } from '@/store';

// Composant principal de l'application avec authentification
const AppContent: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const colorScheme = useColorScheme();
  const theme = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);
  const TabBarBackgroundComponent = TabBarBackground as unknown as React.ComponentType | undefined;
  const tabBarBackground = useMemo(
    () =>
      TabBarBackgroundComponent
        ? () => <TabBarBackgroundComponent />
        : undefined,
    [TabBarBackgroundComponent],
  );

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
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  // Si l'utilisateur est connecté, afficher l'interface principale avec navigation
  if (isAuthenticated && user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <Tabs
          initialRouteName="accueil"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.tint,
            tabBarInactiveTintColor: theme.tabIconDefault,
            tabBarButton: HapticTab,
            tabBarStyle: {
              backgroundColor: theme.background,
              borderTopColor: theme.icon,
            },
            tabBarBackground,
          }}
        >
          <Tabs.Screen
            name="accueil"
            options={{
              title: 'Accueil',
              tabBarIcon: ({ color }) => (
                <IconSymbol name="house.fill" size={28} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="articles"
            options={{
              title: 'Articles',
              tabBarIcon: ({ color }) => (
                <IconSymbol name="square.grid.2x2.fill" size={28} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="stock"
            options={{
              title: 'Inventaire',
              tabBarIcon: ({ color }) => (
                <IconSymbol name="cube.box.fill" size={28} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="ventes"
            options={{
              title: 'Ventes',
              tabBarIcon: ({ color }) => (
                <IconSymbol name="cart.fill" size={28} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="parametres"
            options={{
              title: 'Paramètres',
              tabBarIcon: ({ color }) => (
                <IconSymbol name="gearshape.fill" size={28} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    );
  }

  // Sinon, afficher le formulaire de connexion ou d'inscription
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});