import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
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

export default function Welcome() {
  const router = useRouter();
  const { signIn } = useAuthContext();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  async function signInWithEmail() {
    setLoading(true);
    setErrorMessage('');

    const rzUsername = username.trim().toLowerCase();
    const email = `${rzUsername}@hs-esslingen.de`;

    if (!rzUsername || !password) {
      setErrorMessage('Bitte Benutzername und Passwort eingeben.');
      setLoading(false);
      return;
    }

    try {
      const { data: admin, error: adminError } = await supabase
        .from('AdminNutzer')
        .select('*')
        .eq('RZ-Kennung', rzUsername)
        .eq('Passwort', password)
        .maybeSingle();

      if (adminError) {
        console.error('Admin Login Fehler:', adminError);
      }

      if (admin) {
        await signIn(rzUsername);
        setLoading(false);
        router.replace('/(admin)/uebersicht' as any);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setErrorMessage('Benutzername oder Passwort ist falsch.');
        setLoading(false);
        return;
      }

      await signIn(rzUsername);

      setLoading(false);
      router.replace('/(tabs)/bestellungen' as any);
    } catch (error) {
      console.error('Login Fehler:', error);
      setErrorMessage(
        'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
      );
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const rzUsername = username.trim().toLowerCase();

    if (!rzUsername) {
      Alert.alert(
        'RZ-Benutzername fehlt',
        'Bitte geben Sie zuerst Ihren RZ-Benutzernamen ein.'
      );
      return;
    }

    const email = `${rzUsername}@hs-esslingen.de`;

    router.replace({
      pathname: '/reset-password',
      params: { email },
    } as any);
  }

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Login</Text>
        </View>

        <ImageBackground
          source={require('@/assets/images/campus-bg.jpg')}
          style={styles.cardBackground}
          resizeMode="cover"
        >
          <View style={styles.card}>
            <Image
              source={require('@/assets/images/Logo_Hs_Esslingen.jpg')}
              style={styles.logo}
            />

            <Text style={styles.cardTitle}>Bei Ihrem Konto anmelden</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>RZ-Benutzername (keine E-Mail-Adresse)</Text>

              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Benutzername"
                placeholderTextColor="#9b9b9b"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={[styles.input, !username && styles.inputPlaceholder]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort</Text>

              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Passwort"
                  placeholderTextColor="#9b9b9b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={[styles.passwordInput, !password && styles.inputPlaceholder]}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
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
              style={styles.button}
              disabled={loading}
              onPress={signInWithEmail}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Bitte warten...' : 'Anmelden'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotPasswordText}>Passwort vergessen?</Text>
            </TouchableOpacity>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.externalHeading}>
              Nutzen Sie die App zum ersten Mal?
            </Text>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity style={styles.externalBox}>
                <Text style={styles.externalBoxText}>Registrieren</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

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
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
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

  inputPlaceholder: {
    fontSize: 13,
    fontWeight: '400',
  },

  eyeButton: {
    borderLeftWidth: 1,
    borderLeftColor: '#c6c6c6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },

  button: {
    width: '100%',
    backgroundColor: '#18345d',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 12,
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

  forgotPasswordText: {
    color: '#18345d',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textDecorationLine: 'underline',
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
    marginBottom: 10,
    color: '#222222',
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