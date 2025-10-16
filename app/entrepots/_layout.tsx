import { Stack } from 'expo-router';

export default function EntrepotsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Entrepôts',
          headerShown: false, // Header personnalisé dans le composant
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détails Entrepôt',
          headerShown: true,
          headerBackTitle: 'Retour',
        }}
      />
    </Stack>
  );
}

