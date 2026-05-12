import LogoHeader from '@/components/logo-header';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function VerifyNfc() {
  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>1) NFC (empfohlen):</Text>
        </View>

        <View style={styles.nfcBox}>
          <Ionicons name="phone-portrait-outline" size={60} color="#111111" />
          <Ionicons
            name="wifi-outline"
            size={40}
            color="#111111"
            style={styles.wifiIcon}
          />
        </View>

        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Bitte halten Sie Ihren Studierendenausweis auf die Rückseite des Smartphones
          </Text>
        </View>

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
  nfcBox: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    flexDirection: 'row',
    gap: 8,
  },
  wifiIcon: {
    transform: [{ rotate: '90deg' }],
  },
  instructionBox: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 15,
    color: '#111111',
    textAlign: 'center',
    lineHeight: 22,
  },
});
