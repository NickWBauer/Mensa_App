import { useAuthContext } from "@/hooks/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { useRouter, useSegments, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

function RootNavigator() {
  const { isLoggedIn, isLoading, isVerified } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const currentGroup = segments[0];

    if (!isLoggedIn && currentGroup !== "(auth)") {
      router.replace("/(auth)");
    } else if (isLoggedIn && !isVerified && currentGroup !== "(verify)") {
      router.replace("/(verify)/welcome");
    } else if (isLoggedIn && isVerified && currentGroup !== "(tabs)") {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn, isLoading, isVerified]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(verify)" />
      <Stack.Screen name="(tabs)" />
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
