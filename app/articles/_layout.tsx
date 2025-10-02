import { Stack } from 'expo-router';

export default function ArticlesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Articles',
          headerShown: false, // Header personnalisé dans le composant
        }}
      />
    </Stack>
  );
}
