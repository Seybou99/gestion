import { Stack } from 'expo-router';

export default function PlusLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Plus',
          headerShown: false, // Header personnalisé dans le composant
        }}
      />
    </Stack>
  );
}
