import LogoHeader from '@/components/logo-header';
import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0066cc',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    color: '#1a1a1a',
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    backgroundColor: '#0066cc',
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  linkText: {
    fontSize: 14,
    color: '#0066cc',
    textAlign: 'center',
    fontWeight: '600',
  },
});

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
      <View style={styles.container}>
        <LogoHeader />
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            <Text style={styles.titleText}>Registrierung:</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Benutzername</Text>
              <TextInput
                onChangeText={(text) => setUsername(text)}
                value={username}
                placeholder="Username"
                autoCapitalize="none"
                style={styles.input}
                editable={!loading}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort</Text>
              <TextInput
                onChangeText={(text) => setPassword(text)}
                value={password}
                secureTextEntry={true}
                placeholder="Password"
                autoCapitalize="none"
                style={styles.input}
                editable={!loading}
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                disabled={loading}
                onPress={() => signUpWithEmail()}
                style={styles.button}
              >
                <Text style={styles.buttonText}>{loading ? 'Wird registriert...' : 'Registrieren'}</Text>
              </TouchableOpacity>
              
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Bereits registriert? Jetzt anmelden</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </View>
    );
}
// T: Hier aufgehört 16.04.2026
// N: Überarbeitet am 21.04.2026 - Anmeldung mit Username durch automatische Ergänzung der E-Mail-Domain "@hs-esslingen.de" ermöglicht.
