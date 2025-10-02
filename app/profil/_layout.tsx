import { Stack } from 'expo-router';

export default function ProfilLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Profil',
          headerShown: false, // Header personnalisé dans le composant
        }}
      />
    </Stack>
  );
}
