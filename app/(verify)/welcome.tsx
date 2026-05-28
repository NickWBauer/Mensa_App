import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VerifyWelcome() {
  const { profile } = useAuthContext();
  const router = useRouter();

  const vorname = profile?.Vorname ?? '';
  const nachname = profile?.Nachname ?? '';
  const fullName = [vorname, nachname].filter(Boolean).join(' ');
  const greeting = fullName ? `Sehr geehrte/r ${fullName}` : 'Sehr geehrte/r Nutzer/in';

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>
          {greeting},{'\n\n'}
          vielen Dank, dass Sie sich für die appbasierte Bestellversion unserer Mensa in Göppingen entschieden haben.{'\n\n'}
          Da im Rahmen der Nutzung sensible Daten verarbeitet werden, bitten wir Sie, Ihre Identität mithilfe Ihres Studentenausweises zu bestätigen.{'\n\n'}
          Sollte Ihr Mobilgerät nicht über die erforderliche Schnittstelle verfügen, kontaktieren Sie bitte:
        </Text>
        <Text style={styles.email}>Mensa-IT@hs-esslingen.de</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(verify)/method')}
        >
          <Text style={styles.buttonText}>Weiter zur Verifizierung</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  body: {
    fontSize: 15,
    color: '#111111',
    lineHeight: 23,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#1a6bbf',
    marginBottom: 32,
  },
  button: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
});
