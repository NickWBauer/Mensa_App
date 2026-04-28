import LogoHeader from '@/components/logo-header';
import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Index() {
    const { profile, isLoggedIn } = useAuthContext();
    const router = useRouter();

    // Wenn nicht eingeloggt -> zur Auth-Seite navigieren
    React.useEffect(() => {
        if (isLoggedIn === false) {
            router.replace('/(auth)/login');
        }
    }, [isLoggedIn, router]);

    async function onSignOutButtonPress() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.log('Error signing out:', error.message);
        }
    }

    return (
        <View style={styles.outerContainer}>
            <LogoHeader />
            <View style={styles.container}>
                <Text style={styles.welcomeText}>
                    Willkommen{profile?.full_name ? `, ${profile.full_name}` : ''}!
                </Text>
                <Text style={styles.content}>
                    Du bist erfolgreich in der Mensa-App angemeldet.
                </Text>
                <TouchableOpacity style={styles.button} onPress={onSignOutButtonPress}>
                    <Text style={styles.buttonText}>Abmelden</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        padding: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
    },
    content: {
        fontSize: 16,
        color: '#000000',
        textAlign: 'center',
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#dc3545',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 20,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
        
   
