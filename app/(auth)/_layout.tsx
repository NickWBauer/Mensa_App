import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="einmalcode" />
      <Stack.Screen name="studentenausweis-foto" />
    </Stack>
  );
}