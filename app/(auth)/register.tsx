import { supabase } from '@/lib/supabase';
import { Link } from 'expo-router';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function login() {

    
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [name, setName] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    async function signUpWithEmail() {
            const {error} = await supabase.auth.signUp({
                email: username,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });
            if (error) {
                console.log('Error signing up:', error.message);
            }
            setLoading(false);

        }

     return (
        <View>
            <View>
                <TextInput
                    onChangeText={(text) => setName(text)}
                    value={name}
                    placeholder="Name"
                    
                />
            </View>
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
                    <Text>Sign In</Text>
                </Link>
            </View>
        </View>
    );
}
// Hier aufgehört 16.04.2026
