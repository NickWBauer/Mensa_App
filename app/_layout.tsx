import { useAuthContext } from "@/hooks/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { Stack } from "expo-router";
import { ActivityIndicator } from "react-native";

// Mit dieser Funktion wird vor dem Öffnen der App gecheckt, ob der Nutzer eingeloggt ist oder nicht. Je nachdem wird er auf die entsprechenden Screens weitergeleitet.
function RootNavigator() {
 const {isLoggedIn, isLoading} = useAuthContext();

console.log('RootNavigator:', { isLoggedIn, isLoading })

 //Warten auf App-Status
 if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <Stack>

      <Stack.Protected guard ={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{headerShown: true}} />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)" options={{headerShown: true}} />
      </Stack.Protected>

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
