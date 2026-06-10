import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function Profil() {
  const { claims, profile, signOut, bookingStatus, activeAbo } = useAuthContext();

  async function handleSignOut() {
    await signOut();
  }

  const vorname = profile?.['Vorname'] ?? '';
  const nachname = profile?.['Nachname'] ?? '';
  const matrikelnr = profile?.['Matrikelnummer'] ?? '';
  const email = profile?.['E-Mail'] ?? '';
  const rzKennung = profile?.['RZ-Kennung'] ?? String(claims?.sub ?? '');
  const qrValue = rzKennung || 'unbekannt';

  return (
    <View style={styles.container}>
      <LogoHeader showDateTime bookingStatus={bookingStatus} activeAbo={activeAbo} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutzerdaten:</Text>

          <View style={styles.table}>
            <Row label="Vorname:" value={vorname} />
            <Row label="Nachname:" value={nachname} />
            <Row label="Matrikelnr.:" value={matrikelnr} />
            <Row label="E-Mail:" value={email} highlight />
            <Row label="RZ-Kennung:" value={rzKennung} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Persönlicher QR-Code:</Text>

          <View style={styles.qrWrapper}>
            <QRCode value={qrValue} size={160} />
          </View>

          <Text style={styles.qrText}>{qrValue}</Text>
        </View>

        {/* Abmelden — durch Scrollen erreichbar */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueLink]}>
        {value || '-'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  content: {
    padding: 14,
    paddingBottom: 140,
    gap: 14,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#333333',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#99bbdd',
    padding: 14,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    textDecorationLine: 'underline',
    marginBottom: 12,
  },

  table: {
    gap: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  rowLabel: {
    width: 100,
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },

  rowValue: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },

  rowValueLink: {
    color: '#0066cc',
    textDecorationLine: 'underline',
  },

  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  qrText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#333333',
    marginTop: 8,
  },

  signOutBtn: {
    backgroundColor: '#e47676',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
