import LogoHeader from '@/components/logo-header';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LogoHeader />

      <View style={styles.content}>

        {/* Textbox füllt den ganzen verfügbaren Platz */}
        <View style={styles.textBox}>
          <Text style={styles.text}>
            Herzlich Willkommen auf der Bestellapp der Hochschule Esslingen!
          </Text>
          <Text style={styles.text}>
            Hier können Sie bequem Ihre Mahlzeiten vorbestellen, Ihren Speiseplan
            einsehen, Ihr Guthaben verwalten und Ihren persönlichen QR-Code abrufen.
          </Text>
          <Text style={styles.text}>
            Wir wünschen Ihnen einen guten Appetit und viel Freude beim Bestellen!
          </Text>
          <Text style={styles.text}>
            Bitte melden Sie sich an, um alle Funktionen nutzen zu können.
          </Text>
        </View>

        {/* Button bleibt unten */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(auth)/welcome')}
        >
          <Text style={styles.buttonText}>Weiter zum Login</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    gap: 16,
  },
  textBox: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
    padding: 20,
    backgroundColor: '#fafafa',
    gap: 14,
  },
  text: {
    fontSize: 18,
    color: '#111111',
    lineHeight: 28,
  },
  button: {
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#DDEEFF',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#111111',
  },
});