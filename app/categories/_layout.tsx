import { Stack } from 'expo-router';

export default function CategoriesLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{
          title: 'Catégories',
          headerShown: false, // On gère notre propre header
        }} 
      />
    </Stack>
  );
}
