import LogoHeader from '@/components/logo-header';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <LogoHeader />

      {/* Inhalt */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.textBox}>
          <Text style={styles.text}>
            Herzlich Willkommen auf der Bestellapp der Hochschule Esslingen.
          </Text>

          <Text style={styles.text}>
            Hier können Sie bequem Ihre Mahlzeiten vorbestellen, Ihren
            Speiseplan einsehen und Ihren persönlichen QR-Code abrufen.
          </Text>

          <Text style={styles.text}>
            Bitte melden Sie sich an oder registrieren Sie sich, um die App
            nutzen zu können.
          </Text>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(auth)/welcome')}
        >
          <Text style={styles.buttonText}>
            Weiter zum Login
          </Text>
        </TouchableOpacity>

        {/* Extra Abstand unten */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },

  textBox: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
    padding: 20,
    backgroundColor: '#fafafa',
    marginBottom: 24,
  },

  text: {
    fontSize: 18,
    color: '#111111',
    lineHeight: 28,
    marginBottom: 16,
  },

  button: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#DDEEFF',
    alignItems: 'center',
  },

  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
});