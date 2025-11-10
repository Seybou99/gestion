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
      <Stack.Screen
        name="recu"
        options={{
          title: "Historique des ventes",
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen
        name="remboursement"
        options={{
          title: "Remboursements",
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen
        name="client"
        options={{
          title: "Clients",
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen
        name="devis"
        options={{
          title: "Devis",
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen
        name="profil"
        options={{
          title: "Profil",
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
