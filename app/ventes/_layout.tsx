import { Stack } from 'expo-router';

export default function VentesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Point de Vente',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
