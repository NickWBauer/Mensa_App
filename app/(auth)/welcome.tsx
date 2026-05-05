import LogoHeader from '@/components/logo-header';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.contentContainer}>

        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Login:</Text>
        </View>

        <Link href="/(auth)/login-intern" asChild>
          <TouchableOpacity style={styles.ssoBox}>
            <Ionicons name="lock-closed" size={110} color="#ffffff" style={styles.icon} />
            <Text style={styles.ssoText}>SSO-Login</Text>
            <Text style={styles.ssoSubText}>mit Ihrem Hochschulaccount</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/login-extern" asChild>
          <TouchableOpacity style={styles.externalButton}>
            <Text style={styles.externalText}>Login</Text>
            <Text style={styles.externalSubText}>für externe Accounts</Text>
          </TouchableOpacity>
        </Link>

        <Text style={styles.helpText}>Help</Text>

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
    justifyContent: 'flex-start',
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
    marginBottom: 28,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  ssoBox: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    backgroundColor: '#18345d',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  icon: {
    marginBottom: 16,
  },
  ssoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  ssoSubText: {
    fontSize: 13,
    color: '#ccdcf0',
    textAlign: 'center',
  },
  externalButton: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#b0b0b0',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  externalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  externalSubText: {
    fontSize: 12,
    color: '#eeeeee',
    marginTop: 4,
  },
  helpText: {
    fontSize: 16,
    color: '#0066cc',
    fontStyle: 'italic',
  },
});
