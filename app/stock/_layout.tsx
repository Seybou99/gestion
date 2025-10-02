import { Stack } from 'expo-router';

export default function StockLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Stock',
          headerShown: false, // Header personnalisé dans le composant
        }}
      />
    </Stack>
  );
}
