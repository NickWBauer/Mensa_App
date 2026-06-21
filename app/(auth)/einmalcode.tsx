import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/providers/auth-provider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setItemAsync } from 'expo-secure-store';
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

export default function Einmalcode() {
  const router = useRouter();
  const { signIn } = useAuthContext();

  const params = useLocalSearchParams();

  const username = String(params.username ?? '').trim().toLowerCase();
  const email = String(params.email ?? '').trim().toLowerCase();
  const password = String(params.password ?? '');

  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function hasExistingRegistration() {
    const [{ data: existingUsername, error: usernameError }, { data: existingEmail, error: emailError }] = await Promise.all([
      supabase
        .from('students')
        .select('username')
        .eq('username', username)
        .maybeSingle(),
      supabase
        .from('students')
        .select('email')
        .eq('email', email)
        .maybeSingle(),
    ]);

    if (usernameError || emailError) {
      Alert.alert('Fehler', 'Die Registrierungsdaten konnten nicht geprüft werden.');
      return true;
    }

    if (existingUsername) {
      Alert.alert(
        'Benutzername bereits vergeben',
        'Für diesen RZ-Benutzernamen existiert bereits ein Konto.'
      );
      return true;
    }

    if (existingEmail) {
      Alert.alert(
        'E-Mail bereits registriert',
        'Für diese Hochschul-E-Mail existiert bereits ein Konto.'
      );
      return true;
    }

    const { data: authUserExists, error: authUserExistsError } =
      await supabase.rpc('is_auth_user_registered', {
        check_email: email,
      });

    if (authUserExistsError) {
      Alert.alert('Fehler', 'Die E-Mail-Adresse konnte nicht geprüft werden. Bitte später erneut versuchen.');
      return true;
    }

    if (authUserExists === true) {
      Alert.alert(
        'E-Mail bereits registriert',
        'Für diese Hochschul-E-Mail existiert bereits ein Konto.'
      );
      return true;
    }

    return false;
  }

  async function sendCode() {
    if (await hasExistingRegistration()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Fehler', error.message);
      return;
    }

    Alert.alert('Code gesendet', `Der Einmalcode wurde an ${email} gesendet.`);
  }

  async function verifyCode() {
    if (await hasExistingRegistration()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      setLoading(false);
      Alert.alert('Fehler', error.message);
      return;
    }

    if (data.session?.access_token && data.session?.refresh_token) {
      await Promise.all([
        setItemAsync(ACCESS_TOKEN_KEY, data.session.access_token),
        setItemAsync(REFRESH_TOKEN_KEY, data.session.refresh_token),
      ]);
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError && !passwordError.message.toLowerCase().includes('different')) {
      setLoading(false);
      Alert.alert('Fehler beim Passwort', passwordError.message);
      return;
    }

    const { error: insertError } = await supabase.from('students').insert({
      username,
      email,
      user_id: data.user?.id,
      verification_method: 'einmalcode',
    });

    if (insertError) {
      setLoading(false);
      Alert.alert('Fehler beim Speichern', insertError.message);
      return;
    }

   // await signIn(username);

    setLoading(false);

    router.replace({
      pathname: '/(auth)/studentenausweis-foto',
      params: {
        username,
        email,
      },
    } as any);
  }

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Einmalcode</Text>
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

            <Text style={styles.cardTitle}>
              Der Einmalcode wird an folgende Hochschul-E-Mail gesendet:
            </Text>

            <Text style={styles.emailText}>{email}</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={sendCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Bitte warten...' : 'Einmalcode senden'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Einmalcode</Text>

              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Code eingeben"
                placeholderTextColor="#9b9b9b"
                keyboardType="number-pad"
                style={[styles.input, !code && styles.inputPlaceholder]}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={verifyCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Code bestätigen</Text>
            </TouchableOpacity>
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
    marginBottom: 10,
    textAlign: 'center',
  },

  emailText: {
    fontSize: 15,
    color: '#18345d',
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },

  inputContainer: {
    width: '100%',
    marginTop: 18,
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
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },

  inputPlaceholder: {
    fontSize: 13,
    fontWeight: '400',
  },

  button: {
    width: '100%',
    backgroundColor: '#18345d',
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});