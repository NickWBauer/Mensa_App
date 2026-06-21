import LogoHeader from '@/components/logo-header';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
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
  const router = useRouter();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [registrationError, setRegistrationError] = React.useState('');

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

  async function handleRegister() {
    if (!validateRegistration()) return;

    setRegistrationError('');
    setIsChecking(true);

    try {
      const [{ data: existingByUsername, error: usernameError }, { data: existingByEmail, error: emailError }] = await Promise.all([
        supabase
        .from('students')
        .select('username')
        .eq('username', rzUsername)
        .maybeSingle(),
        supabase
          .from('students')
          .select('email')
          .eq('email', email)
          .maybeSingle(),
      ]);

      if (usernameError || emailError) {
        Alert.alert(
          'Fehler',
          'Der Benutzername oder die E-Mail konnte nicht überprüft werden.'
        );
        return;
      }

      if (existingByUsername) {
        setRegistrationError('Nutzer bereits registriert.');
        return;
      }

      if (existingByEmail) {
        setRegistrationError('Nutzer bereits registriert.');
        return;
      }

      const { error: authEmailCheckError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (!authEmailCheckError) {
        setRegistrationError('Nutzer bereits registriert.');
        return;
      }

      const authErrorText = authEmailCheckError.message.toLowerCase();
      const emailNotFound =
        authErrorText.includes('user not found') ||
        authErrorText.includes('no user found') ||
        authErrorText.includes('email not found') ||
        authErrorText.includes('not found');

      if (!emailNotFound) {
        setRegistrationError('E-Mail-Adresse konnte nicht geprüft werden.');
        return;
      }

      router.push({
        pathname: '/(auth)/einmalcode' as any,
        params: {
          username: rzUsername,
          email,
          password,
        },
      });
    } catch {
      Alert.alert(
        'Fehler',
        'Bei der Registrierung ist ein Fehler aufgetreten.'
      );
    } finally {
      setIsChecking(false);
    }
  }

  const canContinue =
    rzUsername.length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    !isChecking;

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
                onChangeText={(text) => {
                  setUsername(text);
                  setRegistrationError('');
                }}
                placeholder="z.B. mamuwt01"
                placeholderTextColor="#9b9b9b"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, !username && styles.inputPlaceholder]}
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

              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setRegistrationError('');
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="Passwort eingeben"
                  placeholderTextColor="#9b9b9b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.passwordInput, !password && styles.inputPlaceholder]}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#888888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort wiederholen</Text>

              <View style={styles.passwordRow}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setRegistrationError('');
                  }}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Passwort erneut eingeben"
                  placeholderTextColor="#9b9b9b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.passwordInput,
                    !confirmPassword && styles.inputPlaceholder,
                  ]}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#888888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {confirmPassword.length > 0 && password !== confirmPassword ? (
              <Text style={styles.errorText}>
                Die Passwörter stimmen nicht überein.
              </Text>
            ) : null}

            {registrationError ? (
              <Text style={styles.errorText}>{registrationError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                !canContinue && styles.disabledButton,
              ]}
              disabled={!canContinue}
              onPress={handleRegister}
            >
              <Text style={styles.buttonText}>
                {isChecking ? 'Wird geprüft...' : 'Registrieren'}
              </Text>
            </TouchableOpacity>

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
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 6,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c6c6c6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c6c6c6',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },

  eyeButton: {
    borderLeftWidth: 1,
    borderLeftColor: '#c6c6c6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },

  inputPlaceholder: {
    fontSize: 13,
    fontWeight: '400',
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