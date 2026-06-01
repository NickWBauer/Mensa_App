import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import {
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
      const { data: admin } = await supabase
        .from('AdminNutzer')
        .select('RZ-Kennung')
        .eq('RZ-Kennung', rzUsername)
        .eq('Passwort', password)
        .maybeSingle();

      if (admin) {
        await signIn(rzUsername);
        setLoading(false);
        router.replace('/(admin)/uebersicht' as any);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setErrorMessage('Benutzername oder Passwort ist falsch.');
        setLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('username', rzUsername)
        .maybeSingle();

      if (studentError || !student) {
        setErrorMessage('Dieser Benutzer ist nicht in students registriert.');
        setLoading(false);
        return;
      }

      await signIn(rzUsername);

      setLoading(false);
      router.replace('/(tabs)/bestellungen' as any);
    } catch (error) {
      setErrorMessage(
        'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
      );
      setLoading(false);
    }
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
              <Text style={styles.label}>RZ Benutzername</Text>

              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="RZ Benutzername"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort</Text>

              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Passwort"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.passwordInput}
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

            <TouchableOpacity
              style={styles.button}
              disabled={loading}
              onPress={signInWithEmail}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Wird angemeldet...' : 'Anmelden'}
              </Text>
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
    marginBottom: 20,
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