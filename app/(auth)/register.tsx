import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function login() {
    const router = useRouter();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    async function signUpWithEmail() {
            const {error} = await supabase.auth.signUp({
                email: username + "@hs-esslingen.de",
                password: password,
            });
            if (error) {
                console.log('Error signing up:', error.message);
                setLoading(false);
            } else {
                router.push('/set-name');
            }
        }

     return (
        <View>
            <View>
                <TextInput
                    onChangeText={(text) => setUsername(text)}
                    value={username}
                    placeholder="Username"
                    autoCapitalize="none"
                />
            </View>
            <View>
                <TextInput
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Password"
                    autoCapitalize="none"
                />
            </View>
            <View>
                <TouchableOpacity
                    disabled={loading}
                    onPress={() => signUpWithEmail()}
                >
                    <Text>SIGN UP</Text>
                </TouchableOpacity>
                <Link href="/(auth)/login">
                    <Text>Already registered? Sign In</Text>
                </Link>
            </View>
        </View>
    );
}
// T: Hier aufgehört 16.04.2026
// N: Überarbeitet am 21.04.2026 - Anmeldung mit Username durch automatische Ergänzung der E-Mail-Domain "@hs-esslingen.de" ermöglicht.
