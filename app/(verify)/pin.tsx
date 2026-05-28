import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { setItemAsync } from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VerifyPin() {
  const { profile, refetchProfile } = useAuthContext();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinSent, setPinSent] = useState(false);
  const [error, setError] = useState('');

  const email = profile?.['E-Mail'] as string | undefined;

  const requestPin = async () => {
    if (!email) {
      setError('Keine E-Mail-Adresse im Profil gefunden.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (otpError) {
      setError('Fehler beim Senden. Bitte versuchen Sie es erneut.');
      console.error(otpError);
    } else {
      setPinSent(true);
    }

    setLoading(false);
  };

  const handleVerify = async () => {
    if (!pin.trim() || !email) {
      setError('Bitte geben Sie den PIN ein.');
      return;
    }

    setLoading(true);
    setError('');

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: pin.trim(),
      type: 'email',
    });

    if (verifyError) {
      setError('Ungültiger oder abgelaufener PIN.');
      setLoading(false);
      return;
    }

    // Tokens für spätere Bestellungen speichern
    if (verifyData.session) {
      await Promise.all([
        setItemAsync('mensa_access_token', verifyData.session.access_token),
        setItemAsync('mensa_refresh_token', verifyData.session.refresh_token),
      ]).catch(() => {});
    }

    // In RegistriertePersonen eintragen → gilt als verifiziert
    const { error: insertError } = await supabase.from('RegistriertePersonen').insert({
      Vorname: profile?.Vorname,
      Nachname: profile?.Nachname,
      Matrikelnummer: profile?.Matrikelnummer,
      'RZ-Kennung': profile?.['RZ-Kennung'],
      Passwort: profile?.Passwort,
      'E-Mail': profile?.['E-Mail'],
    });

    // 23505 = duplicate key → Nutzer bereits registriert, trotzdem weiterleiten
    if (insertError && insertError.code !== '23505') {
      setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
      console.error(insertError);
      setLoading(false);
      return;
    }

    await refetchProfile();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>2) Einmal-PIN</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Fordern Sie Ihren Einmal-PIN an. Er wird automatisch an Ihre hinterlegte E-Mail-Adresse gesendet.
          </Text>
          {email ? (
            <Text style={styles.emailText}>{email}</Text>
          ) : null}
        </View>

        {!pinSent ? (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
              onPress={requestPin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#18345d" />
              ) : (
                <Text style={styles.buttonSecondaryText}>PIN per E-Mail anfordern</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                PIN wurde an {email} gesendet. Bitte prüfen Sie Ihr Postfach.
              </Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Einmal-PIN:</Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={(t) => { setPin(t); setError(''); }}
                placeholder="6-stelliger Code"
                keyboardType="number-pad"
                maxLength={6}
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Verifizieren</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={requestPin} disabled={loading}>
              <Text style={styles.resendText}>Keinen Code erhalten? Erneut senden</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  titleBar: {
    width: '100%',
    backgroundColor: '#DDEEFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  titleText: { fontSize: 16, fontWeight: '700', color: '#111111' },
  infoBox: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoText: { fontSize: 14, color: '#111111', lineHeight: 20, marginBottom: 6 },
  emailText: { fontSize: 14, fontWeight: '600', color: '#18345d' },
  successBox: {
    width: '100%',
    backgroundColor: '#e6f4ea',
    borderWidth: 1.5,
    borderColor: '#2d7a3a',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  successText: { fontSize: 14, color: '#1a4d22', lineHeight: 20 },
  inputRow: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: { fontSize: 15, color: '#111111', marginRight: 8, fontWeight: '500' },
  input: { flex: 1, fontSize: 18, color: '#111111', letterSpacing: 4 },
  errorText: {
    width: '100%',
    color: '#cc0000',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#18345d',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#18345d',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  buttonSecondaryText: { fontSize: 15, fontWeight: '600', color: '#18345d' },
  resendText: { fontSize: 13, color: '#1a6bbf', textDecorationLine: 'underline' },
});
