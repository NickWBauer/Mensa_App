import { supabase } from '@/lib/supabase';
import { Link } from 'expo-router';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function login() {

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    async function onSignOutButtonPress() {
            const {error} = await supabase.auth.signInWithPassword({
                email: username,
                password: password
            });
            if (error) {
                console.log('Error signing in:', error.message);
            }
            setLoading(false);

        }

     return (
        <View>
            <View>
                <TextInput
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    placeholder="email@address.com"
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
                    onPress={() => signInWithEmail()}
                >
                    <Text>SIGN IN</Text>
                </TouchableOpacity>
                <Link href="/(auth)/register">
                    <Text>Don't have an account? Sign Up</Text>
                </Link>
            </View>
        </View>
    );
}
