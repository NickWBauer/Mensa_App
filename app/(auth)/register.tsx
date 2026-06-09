import LogoHeader from '@/components/logo-header';
import { Link } from 'expo-router';
import React from 'react';
import {
  Alert,
  Image,
  ImageBackground,
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
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const rzUsername = username.trim().toLowerCase();
  const email = `${rzUsername}@hs-esslingen.de`;

  function validateRegistration() {
    if (!rzUsername) {
      Alert.alert('Fehler', 'Bitte geben Sie Ihren RZ-Benutzernamen ein.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 6 Zeichen lang sein.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
      return false;
    }

    return true;
  }

  const canContinue =
    rzUsername.length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Registrierung</Text>
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

            <Text style={styles.cardTitle}>Neues Konto erstellen</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>RZ Benutzername</Text>

              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="z.B. mamuwt01"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Hochschul-E-Mail</Text>

              <TextInput
                value={email}
                editable={false}
                style={[styles.input, styles.disabledInput]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort</Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Passwort eingeben"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort wiederholen</Text>

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Passwort erneut eingeben"
                style={styles.input}
              />
            </View>

            {confirmPassword.length > 0 && password !== confirmPassword ? (
              <Text style={styles.errorText}>
                Die Passwörter stimmen nicht überein.
              </Text>
            ) : null}

            {canContinue ? (
              <Link
                href={{
                  pathname: '/(auth)/verification' as any,
                  params: {
                    username: rzUsername,
                    email,
                    password,
                  },
                }}
                asChild
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => validateRegistration()}
                >
                  <Text style={styles.buttonText}>Registrieren</Text>
                </TouchableOpacity>
              </Link>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.disabledButton]}
                onPress={() => validateRegistration()}
              >
                <Text style={styles.buttonText}>Registrieren</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            <Link href="/(auth)/welcome" asChild>
              <TouchableOpacity style={styles.externalBox}>
                <Text style={styles.externalBoxText}>
                  Bereits registriert? Zum Login
                </Text>
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
    color: '#111111',
  },

  cardBackground: {
    alignSelf: 'stretch',
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  cardBackgroundImage: {},

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    padding: 24,
    alignItems: 'center',
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
    backgroundColor: '#fafafa',
    color: '#111111',
  },

  disabledInput: {
    backgroundColor: '#eeeeee',
    color: '#666666',
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

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
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
    textAlign: 'center',
    marginBottom: 12,
  },
});