import LogoHeader from '@/components/logo-header';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VerifyMethod() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Anmeldeverfahren:</Text>
        </View>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/(verify)/nfc')}
        >
          <Text style={styles.optionText}>1) NFC (empfohlen)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/(verify)/pin')}
        >
          <Text style={styles.optionText}>2) Einmal-PIN</Text>
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
    marginBottom: 32,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  optionButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
});
