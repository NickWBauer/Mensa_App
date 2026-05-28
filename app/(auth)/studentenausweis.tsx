import LogoHeader from '@/components/logo-header';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

NfcManager.start();

export default function Studentenausweis() {
  const { email, password } = useLocalSearchParams<{
    email: string;
    password: string;
  }>();

  async function scanStudentenausweis() {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const tag = await NfcManager.getTag();
      const nfcUid = tag?.id;

      if (!nfcUid) {
        Alert.alert('Fehler', 'Keine NFC-UID gefunden.');
        return;
      }

      if (String(password).length < 6) {
        Alert.alert(
          'Ungültiges Passwort',
          'Das Passwort muss mindestens 6 Zeichen lang sein.'
        );
        return;
      }

      const { data } = await supabase.auth.signUp({
        email: String(email),
        password: String(password),
      });

      await supabase.from('students').insert({
        user_id: data.user?.id,
        email: String(email),
        nfc_uid: nfcUid,
      });

      Alert.alert('Erfolgreich', 'Studentenausweis wurde gespeichert.');
    } catch (error) {
      console.log(error);
      Alert.alert('Fehler', 'NFC-Scan fehlgeschlagen.');
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  }

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Studentenausweis verifizieren</Text>

          <Text style={styles.text}>
            Halten Sie Ihren Studentenausweis zum Auslesen des NFC-Tags an die
            Rückseite Ihres Smartphones.
          </Text>

          <TouchableOpacity style={styles.button} onPress={scanStudentenausweis}>
            <Text style={styles.buttonText}>NFC-Scan starten</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
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
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
