import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Index() {
    const { profile } = useAuthContext();

    async function onSignOutButtonPress() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.log('Error signing out:', error.message);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.content}>
                Edit app/index.tsx to edit this screen.
            </Text>
            <Text>{profile?.full_name}</Text>
            <Button title="Sign out" onPress={onSignOutButtonPress} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },
    content: {
        fontSize: 15,
    },
});