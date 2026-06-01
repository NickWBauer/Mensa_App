import LogoHeader from '@/components/logo-header';
import { Link, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Verification() {
  const params = useLocalSearchParams();

  const username = String(params.username ?? '');
  const email = String(params.email ?? '');
  const password = String(params.password ?? '');

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Verifizierung</Text>
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
              Bitte wählen Sie eine Verifizierungsmethode aus.
            </Text>

            <Link
              href={{
                pathname: '/(auth)/einmalcode' as any,
                params: { username, email, password },
              }}
              asChild
            >
              <TouchableOpacity style={styles.optionBox}>
                <Text style={styles.optionTitle}>Einmalcode</Text>
                <Text style={styles.optionText}>
                  Code per Hochschul-E-Mail erhalten
                </Text>
              </TouchableOpacity>
            </Link>

            <Link
              href={{
                pathname: '/(auth)/studentenausweis' as any,
                params: { username, email, password },
              }}
              asChild
            >
              <TouchableOpacity style={styles.optionBox}>
                <Text style={styles.optionTitle}>Studentenausweis</Text>
                <Text style={styles.optionText}>
                  Verifizierung per NFC-Scan
                </Text>
              </TouchableOpacity>
            </Link>

            <Link
              href={{
                pathname: '/(auth)/nfc-tools' as any,
                params: { username, email, password },
              }}
              asChild
            >
              <TouchableOpacity style={styles.optionBox}>
                <Text style={styles.optionTitle}>NFC Tools</Text>
                <Text style={styles.optionText}>
                  Verifizierung über externe NFC-App
                </Text>
              </TouchableOpacity>
            </Link>
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
    marginBottom: 20,
    textAlign: 'center',
  },

  optionBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18345d',
    marginBottom: 4,
  },

  optionText: {
    fontSize: 13,
    color: '#444444',
    textAlign: 'center',
  },
});