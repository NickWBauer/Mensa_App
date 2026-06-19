import { useAuthContext } from '@/hooks/use-auth-context';
import AuthProvider from '@/providers/auth-provider';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  View,
} from 'react-native';

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(() => {
      onFinish();
    });
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={splashStyles.container}>
      <Image
        source={require('@/assets/images/mensago-splash.jpeg')}
        style={splashStyles.logo}
        resizeMode="contain"
      />
      <View style={splashStyles.barBackground}>
        <Animated.View style={[splashStyles.barFill, { width: barWidth }]} />
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  logo: {
    width: 280,
    height: 120,
    marginBottom: 48,
  },
  barBackground: {
    width: '70%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#cc0000',
    borderRadius: 2,
  },
});

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const currentGroup = segments[0];
  const redirectPending =
    (!isLoggedIn && currentGroup !== '(auth)') ||
    (isLoggedIn && isAdmin && currentGroup !== '(admin)') ||
    (isLoggedIn && !isAdmin && currentGroup !== '(tabs)');

  if (redirectPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
