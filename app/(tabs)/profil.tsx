import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function Profil() {
  const { profile, claims } = useAuthContext();
  const [email, setEmail] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)');
  }

  const vorname = profile?.vorname ?? '';
  const nachname = profile?.nachname ?? '';
  const matrikelnr = profile?.matrikelnr ?? '';
  const studiengang = profile?.studiengang ?? '';
  const qrValue = claims?.sub ?? 'unbekannt';

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutzerdaten:</Text>
          <View style={styles.table}>
            <Row label="Vorname:" value={vorname} />
            <Row label="Nachname:" value={nachname} />
            <Row label="Matrikelnr.:" value={matrikelnr} />
            <Row label="Studiengang:" value={studiengang} />
            <Row label="E-Mail:" value={email} highlight />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Persönlicher QR-Code:</Text>
          <View style={styles.qrWrapper}>
            <QRCode value={qrValue} size={160} />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Abmelden</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueLink]}>{value || '-'}</Text>
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
    paddingBottom: 90,
    gap: 14,
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
  signOutBtn: {
    backgroundColor: '#e47676',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
