import LogoHeader from '@/components/logo-header';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
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

export default function Einmalcode() {
  const params = useLocalSearchParams();

  const username = String(params.username ?? '').trim().toLowerCase();
  const email = String(params.email ?? '').trim().toLowerCase();
  const password = String(params.password ?? '');

  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function sendCode() {
    setLoading(true);

    const { data: existingUser, error: checkError } = await supabase
      .from('students')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      setLoading(false);
      Alert.alert('Fehler', checkError.message);
      return;
    }

    if (existingUser) {
      setLoading(false);
      Alert.alert(
        'Registrierung nicht möglich',
        'Dieser RZ-Benutzername ist bereits registriert.'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
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
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email',
    });

    if (error) {
      setLoading(false);
      Alert.alert('Fehler', error.message);
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: password,
    });

    if (passwordError) {
      setLoading(false);
      Alert.alert('Fehler beim Passwort', passwordError.message);
      return;
    }

    const { error: insertError } = await supabase.from('students').insert({
      username: username,
      email: email,
      user_id: data.user?.id,
      verification_method: 'einmalcode',
    });

    if (insertError) {
      console.log('Insert students error:', insertError.message);

      setLoading(false);
      Alert.alert('Fehler beim Speichern in students', insertError.message);
      return;
    }

    setLoading(false);

    Alert.alert('Erfolgreich', 'Registrierung abgeschlossen.');
  }

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Einmalcode-Verifizierung</Text>

          <Text style={styles.text}>
            Der Einmalcode wird an folgende Hochschul-E-Mail gesendet:
          </Text>

          <Text style={styles.email}>{email}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={sendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Bitte warten...' : 'Einmalcode senden'}
            </Text>
          </TouchableOpacity>

          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Einmalcode eingeben"
            keyboardType="number-pad"
            style={styles.input}
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={verifyCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Code bestätigen</Text>
          </TouchableOpacity>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    elevation: 5,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0066cc',
    textAlign: 'center',
    marginBottom: 20,
  },

  text: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },

  email: {
    fontSize: 16,
    color: '#0066cc',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 24,
  },

  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    color: '#1a1a1a',
    marginVertical: 24,
    textAlign: 'center',
  },

  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});