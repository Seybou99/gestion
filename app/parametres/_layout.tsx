import { Stack } from "expo-router";
import React from 'react';

export default function ParametresLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Paramètres",
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack>
  );
}
