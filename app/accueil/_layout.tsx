import { Stack } from 'expo-router';

export default function AccueilLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerShown: false, // Header personnalisé dans le composant
        }}
      />
    </Stack>
  );
}
