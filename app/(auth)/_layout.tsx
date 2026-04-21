import { Stack } from 'expo-router';
import React from 'react';

export default function _layout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
    }}>
        <Stack.Screen name="login"/>
        <Stack.Screen name="register"/>
        <Stack.Screen name="set-name"/>
    </Stack>

  );
}