import LogoHeader from '@/components/logo-header';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = String(params.email ?? '').trim().toLowerCase();

  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [mailSent, setMailSent] = React.useState(false);

  async function handleSendRecoveryEmail() {
    if (!email) {
      Alert.alert('Fehler', 'Keine E-Mail-Adresse übergeben.');
      return;
    }

    setSendingEmail(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setSendingEmail(false);

    if (error) {
      Alert.alert('Fehler', error.message);
      return;
    }

    setMailSent(true);
    Alert.alert('E-Mail gesendet', 'Der Einmalcode wurde an die E-Mail-Adresse gesendet.');
  }

  async function handleResetPassword() {
    if (!email) {
      Alert.alert('Fehler', 'Keine E-Mail-Adresse übergeben.');
      return;
    }

    if (!code.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie den Einmalcode ein.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'recovery',
    });

    if (error || !data.user) {
      setLoading(false);
      Alert.alert('Fehler', error?.message ?? 'Der Code ist ungültig.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      Alert.alert('Fehler', updateError.message);
      return;
    }

    Alert.alert('Erfolgreich', 'Ihr Passwort wurde geändert.');
    router.replace('/(auth)/welcome' as any);
  }

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Passwort zurücksetzen</Text>
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

            <Text style={styles.cardTitle}>
              Geben Sie den Einmalcode und Ihr neues Passwort ein.
            </Text>

            <Text style={styles.infoText}>
              Der Einmalcode wird an folgende Hochschul-E-Mail gesendet:
            </Text>

            <Text style={styles.emailText}>{email}</Text>

            <TouchableOpacity
              style={styles.button}
              disabled={sendingEmail}
              onPress={handleSendRecoveryEmail}
            >
              <Text style={styles.buttonText}>
                {sendingEmail ? 'Sende E-Mail...' : mailSent ? 'Einmalcode erneut senden' : 'Einmalcode senden'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Einmalcode</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Einmalcode eingeben"
                placeholderTextColor="#9b9b9b"
                keyboardType="number-pad"
                style={[styles.input, !code && styles.inputPlaceholder]}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Neues Passwort</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Neues Passwort eingeben"
                placeholderTextColor="#9b9b9b"
                secureTextEntry
                style={[styles.input, !password && styles.inputPlaceholder]}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passwort wiederholen</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Passwort erneut eingeben"
                placeholderTextColor="#9b9b9b"
                secureTextEntry
                style={[styles.input, !confirmPassword && styles.inputPlaceholder]}
                editable={!loading}
              />
            </View>

            {confirmPassword.length > 0 && password !== confirmPassword ? (
              <Text style={styles.errorText}>
                Die Passwörter stimmen nicht überein.
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Wird geändert...' : 'Passwort ändern'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={() => router.replace('/(auth)/welcome' as any)}
            >
              <Text style={styles.tertiaryButtonText}>Zurück zum Login</Text>
            </TouchableOpacity>
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
    marginBottom: 14,
    textAlign: 'center',
  },

  infoText: {
    fontSize: 14,
    color: '#444444',
    textAlign: 'center',
    marginBottom: 6,
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
    marginTop: 6,
  },

  tertiaryButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },

  tertiaryButtonText: {
    color: '#444444',
    fontSize: 14,
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

  errorText: {
    width: '100%',
    color: '#cc0000',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
});