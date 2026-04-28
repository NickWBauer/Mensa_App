import { useAuthContext } from "@/hooks/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { Stack } from "expo-router";
import { ActivityIndicator } from "react-native";

// Mit dieser Funktion wird vor dem Öffnen der App gecheckt, ob der Nutzer eingeloggt ist oder nicht. Je nachdem wird er auf die entsprechenden Screens weitergeleitet.
function RootNavigator() {
 const {isLoggedIn, isLoading, profile} = useAuthContext();

console.log('RootNavigator:', { isLoggedIn, isLoading, profile })

 //Warten auf App-Status
 if (isLoading) {
    return <ActivityIndicator />;
  }

  // Wenn eingeloggt und Profil vollständig -> Tabs
  if (isLoggedIn && profile?.full_name) {
    return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{headerShown: false}} />
      </Stack>
    );
  }

  // Wenn eingeloggt aber Profil unvollständig -> Name setzen
  if (isLoggedIn && !profile?.full_name) {
    return (
      <Stack>
        <Stack.Screen name="set-name" options={{headerShown: false}} />
      </Stack>
    );
  }

  // Wenn nicht eingeloggt -> Auth
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{headerShown: false}} />
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
