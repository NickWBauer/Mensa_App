import LogoHeader from '@/components/logo-header';
import { Link, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Authentification() {
  const params = useLocalSearchParams();

  const username = String(params.username ?? '');
  const email = String(params.email ?? '');
  const password = String(params.password ?? '');

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Verifizierung</Text>

          <Text style={styles.subtitle}>
            Bitte wählen Sie eine Methode zur Verifizierung aus.
          </Text>

          <View style={styles.tileContainer}>
            <Link
              href={{
                pathname: '/(auth)/einmalcode' as any,
                params: {
                  username,
                  email,
                  password,
                },
              }}
              asChild
            >
              <TouchableOpacity style={styles.tile}>
                <Text style={styles.tileTitle}>Einmalcode</Text>
                <Text style={styles.tileText}>
                  Verifizierung mit einem Code per E-Mail
                </Text>
              </TouchableOpacity>
            </Link>

            <Link
              href={{
                pathname: '/(auth)/studentenausweis' as any,
                params: {
                  username,
                  email,
                  password,
                },
              }}
              asChild
            >
              <TouchableOpacity style={styles.tile}>
                <Text style={styles.tileTitle}>Studentenausweis</Text>
                <Text style={styles.tileText}>
                  Verifizierung durch NFC-Scan des Studentenausweises
                </Text>
              </TouchableOpacity>
            </Link>

            <Link
              href={{
                pathname: '/(auth)/nfc-tools' as any,
                params: {
                  username,
                  email,
                  password,
                },
              }}
              asChild
            >
              <TouchableOpacity style={styles.tile}>
                <Text style={styles.tileTitle}>NFC Tools</Text>
                <Text style={styles.tileText}>
                  Verifizierung über die externe App NFC Tools
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
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
    padding: 24,
    elevation: 5,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0066cc',
    textAlign: 'center',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 28,
  },

  tileContainer: {
    gap: 16,
  },

  tile: {
    backgroundColor: '#eef5ff',
    borderWidth: 2,
    borderColor: '#0066cc',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
  },

  tileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066cc',
    marginBottom: 8,
    textAlign: 'center',
  },

  tileText: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
  },
});