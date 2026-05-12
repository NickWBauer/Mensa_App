import { Stack } from 'expo-router';

export default function VerifyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="method" />
      <Stack.Screen name="nfc" />
      <Stack.Screen name="pin" />
    </Stack>
  );
}
