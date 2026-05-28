import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function login() {
    const { signIn } = useAuthContext();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');

    async function signInWithEmail() {
        setLoading(true);
        setErrorMessage('');

        try {
            const { data: student } = await supabase
                .from('StudentenHochschule')
                .select('RZ-Kennung')
                .eq('RZ-Kennung', username)
                .eq('Passwort', password)
                .maybeSingle();

            if (student) {
                await signIn(username);
                return;
            }

            const { data: admin } = await supabase
                .from('AdminNutzer')
                .select('RZ-Kennung')
                .eq('RZ-Kennung', username)
                .eq('Passwort', password)
                .maybeSingle();

            if (admin) {
                await signIn(username);
                return;
            }

            setErrorMessage('Benutzername oder Passwort ist falsch.');
        } catch (e) {
            setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <LogoHeader />
            <ScrollView contentContainerStyle={styles.contentContainer}>

                <View style={styles.titleBar}>
                    <Text style={styles.titleText}>SSO-Login:</Text>
                </View>

                <ImageBackground
                    source={require('@/assets/images/campus-bg.jpg')}
                    style={styles.cardBackground}
                    imageStyle={styles.cardBackgroundImage}
                    resizeMode="cover"
                >
                    <View style={styles.card}>
                        <Image
                            source={require('@/assets/images/Logo_Hs_Esslingen.jpg')}
                            style={styles.logo}
                        />

                        <Text style={styles.cardTitle}>Bei Ihrem Konto anmelden</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>RZ Benutzername (keine E-Mail-Adresse)</Text>
                            <TextInput
                                onChangeText={(text) => setUsername(text)}
                                value={username}
                                placeholder="RZ Benutzername"
                                autoCapitalize="none"
                                style={styles.input}
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Passwort</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    onChangeText={(text) => setPassword(text)}
                                    value={password}
                                    secureTextEntry={!showPassword}
                                    placeholder="Passwort"
                                    autoCapitalize="none"
                                    style={styles.passwordInput}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off' : 'eye'}
                                        size={20}
                                        color="#888888"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            disabled={loading}
                            onPress={() => signInWithEmail()}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Wird angemeldet...' : 'Anmelden'}
                            </Text>
                        </TouchableOpacity>

                        {errorMessage ? (
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        ) : null}

                        <View style={styles.divider} />

                        <Text style={styles.externalHeading}>Sind Sie externer Nutzer?</Text>
                        <Link href="/(auth)/login-extern" asChild>
                            <TouchableOpacity style={styles.externalBox}>
                                <Text style={styles.externalBoxText}>Login für externe Accounts</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </ImageBackground>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    cardBackground: {
        alignSelf: 'stretch',
        marginHorizontal: -24,
        paddingHorizontal: 24,
        paddingVertical: 20,
        marginBottom: 24,
    },
    cardBackgroundImage: {},
    contentContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 32,
    },
    titleBar: {
        width: '100%',
        backgroundColor: '#DDEEFF',
        borderWidth: 2.5,
        borderColor: '#000000',
        borderRadius: 6,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    titleText: {
        fontSize: 16,
        fontWeight: '700',
        textDecorationLine: 'underline',
        color: '#111111',
    },
    card: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dddddd',
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    logo: {
        width: 180,
        height: 70,
        resizeMode: 'contain',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        color: '#444444',
        marginBottom: 6,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#cccccc',
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111111',
        backgroundColor: '#fafafa',
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#cccccc',
        borderRadius: 4,
        backgroundColor: '#fafafa',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111111',
    },
    eyeButton: {
        paddingHorizontal: 12,
    },
    button: {
        width: '100%',
        backgroundColor: '#18345d',
        borderRadius: 4,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 20,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#e0e0e0',
        marginBottom: 16,
    },
    externalHeading: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222222',
        marginBottom: 10,
    },
    externalBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#cccccc',
        borderRadius: 4,
        paddingVertical: 12,
        alignItems: 'center',
    },
    externalBoxText: {
        fontSize: 14,
        color: '#444444',
    },
    errorText: {
        width: '100%',
        color: '#cc0000',
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
});
