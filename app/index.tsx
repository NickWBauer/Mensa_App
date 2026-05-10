import LogoHeader from '@/components/logo-header';
import { Link } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  contentText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1a1a1a',
    marginBottom: 28,
  },
  buttonContainer: {
    marginTop: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#d6eaff',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});

export default function Index() {
  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.contentText}>
            Herzlich Willkommen auf der Bestellapp der Hochschule Esslingen!

            {'\n\n'}Hier können Sie bequem Ihre Mahlzeiten vorbestellen, Ihren Speiseplan einsehen, Ihr Guthaben verwalten und Ihren persönlichen QR‑Code abrufen.

            {'\n\n'}Wir wünschen Ihnen einen guten Appetit und viel Freude beim Bestellen!

            {'\n\n'}Bitte melden Sie sich an, um alle Funktionen nutzen zu können.
          </Text>

          <View style={styles.buttonContainer}>
            <Link href="/(auth)" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Weiter zum Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
