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

  const username = String(params.username ?? '');
  const email = String(params.email ?? '');
  const password = String(params.password ?? '');

  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function sendCode() {

    setLoading(true);

    try {

      // Zufälligen 6-stelligen Code erzeugen
      const generatedCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // Code in Supabase speichern
      await supabase.from('verification_codes').insert({
        email: email,
        code: generatedCode,
      });

      // Mail senden
      const { error } = await supabase.functions.invoke(
        'send-verification-code',
        {
          body: {
            email: email,
            code: generatedCode,
          },
        }
      );

      if (error) {
        console.log(error);

        Alert.alert(
          'Fehler',
          'Die E-Mail konnte nicht gesendet werden.'
        );

        setLoading(false);
        return;
      }

      Alert.alert(
        'Code gesendet',
        `Der Einmalcode wurde an ${email} gesendet.`
      );

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Fehler',
        'Der Einmalcode konnte nicht gesendet werden.'
      );

    } finally {

      setLoading(false);

    }
  }

  async function verifyCode() {

    setLoading(true);

    try {

      // Prüfen ob Code korrekt ist
      const { data } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) {

        Alert.alert(
          'Fehler',
          'Der eingegebene Code ist falsch.'
        );

        setLoading(false);
        return;
      }

      // Nutzer registrieren
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {

        Alert.alert(
          'Fehler',
          authError.message
        );

        setLoading(false);
        return;
      }

      // Zusätzliche Nutzerdaten speichern
      await supabase.from('students').insert({
        username: username,
        email: email,
        user_id: authData.user?.id,
        verification_method: 'einmalcode',
      });

      Alert.alert(
        'Erfolgreich',
        'Registrierung abgeschlossen.'
      );

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Fehler',
        'Die Verifizierung ist fehlgeschlagen.'
      );

    } finally {

      setLoading(false);

    }
  }

  return (
    <View style={styles.container}>

      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>

        <View style={styles.card}>

          <Text style={styles.title}>
            Einmalcode-Verifizierung
          </Text>

          <Text style={styles.text}>
            Der Einmalcode wird an folgende
            Hochschul-E-Mail gesendet:
          </Text>

          <Text style={styles.email}>
            {email}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={sendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Einmalcode senden
            </Text>
          </TouchableOpacity>

          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Einmalcode eingeben"
            keyboardType="number-pad"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={verifyCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Code bestätigen
            </Text>
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