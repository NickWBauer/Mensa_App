import { useAuthContext } from '@/hooks/use-auth-context';
import AuthProvider from '@/providers/auth-provider';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

function RootNavigator() {
  const { isLoggedIn, isLoading, isAdmin } = useAuthContext();

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const currentGroup = segments[0];

    if (!isLoggedIn) {
      if (currentGroup !== '(auth)') {
        router.replace('/(auth)');
      }
      return;
    }

    if (isAdmin) {
      if (currentGroup !== '(admin)') {
        router.replace('/(admin)/uebersicht');
      }
      return;
    }

    if (currentGroup !== '(tabs)') {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, isAdmin, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}