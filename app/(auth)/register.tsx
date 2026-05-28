import LogoHeader from '@/components/logo-header';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Register() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const router = useRouter();

  const email = username + '@hs-esslingen.de';

  const validatePassword = (): boolean => {
    if (password.length < 6) {
      Alert.alert(
        'Ungültiges Passwort',
        'Das Passwort muss mindestens 6 Zeichen lang sein.'
      );
      return false;
    }
    return true;
  };

  const handleRegister = () => {
    if (!validatePassword()) {
      return;
    }

    router.push({
      pathname: '/(auth)/authentification' as any,
      params: {
        username: username,
        email: email,
        password: password,
      },
    });
  };

  return (
    <View style={styles.container}> 
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.titleText}>Registrierung:</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Benutzername</Text>

            <TextInput
              onChangeText={setUsername}
              value={username}
              placeholder="RZ Benutzername"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Passwort</Text>

            <TextInput
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              placeholder="Passwort"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Registrieren</Text>
            </TouchableOpacity>

            <Link href={'/(auth)/login-intern' as any} asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>
                  Bereits registriert? Jetzt anmelden
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: 40,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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