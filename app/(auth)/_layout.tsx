import { Stack } from 'expo-router';
import React from 'react';

export default function _layout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
    }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login-intern" />
        <Stack.Screen name="login-extern" />
        <Stack.Screen name="register" />
    </Stack>

  );
}