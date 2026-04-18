import { useAuthContext } from "@/hooks/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { Stack } from "expo-router";

// Mit dieser Funktion wird gecheckt, ob der Nutzer eingeloggt ist oder nicht. Je nachdem wird er auf die entsprechenden Screens weitergeleitet.
function RootNavigator() {
 const {isLoggedIn} = useAuthContext();
  return (
    <Stack>

      <Stack.Protected guard ={isLoggedIn}>
        <Stack.Screen name="(tabs)/index" options={{headerShown: false}} />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)/login" options={{headerShown: false}} />
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
