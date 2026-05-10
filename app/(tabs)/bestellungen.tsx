import { Ionicons } from '@expo/vector-icons';
import LogoHeader from '@/components/logo-header';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SubTab = 'vorbestellung' | 'meine' | 'guthaben';

export default function Bestellungen() {
  const [activeTab, setActiveTab] = useState<SubTab>('guthaben');

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <NavItem
          label="Vorbestellung"
          active={activeTab === 'vorbestellung'}
          icon="chevron-forward"
          onPress={() => setActiveTab('vorbestellung')}
        />
        <NavItem
          label="Meine Bestellungen"
          active={activeTab === 'meine'}
          icon="chevron-forward"
          onPress={() => setActiveTab('meine')}
        />
        <NavItem
          label="Guthaben"
          active={activeTab === 'guthaben'}
          icon="checkmark"
          onPress={() => setActiveTab('guthaben')}
        />

        <View style={styles.contentArea}>
          {activeTab === 'vorbestellung' && <VorbestellungContent />}
          {activeTab === 'meine' && <MeineBestellungenContent />}
          {activeTab === 'guthaben' && <GuthabenContent />}
        </View>

      </ScrollView>
    </View>
  );
}

function NavItem({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: 'chevron-forward' | 'checkmark';
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.navBtn, active && styles.navBtnActive]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color="#ffffff" style={styles.navIcon} />
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function VorbestellungContent() {
  return (
    <View>
      <Text style={styles.contentTitle}>Vorbestellung</Text>
      <Text style={styles.contentText}>Hier können Sie Mahlzeiten für kommende Tage vorbestellen.</Text>
    </View>
  );
}

function MeineBestellungenContent() {
  return (
    <View>
      <Text style={styles.contentTitle}>Meine Bestellungen</Text>
      <Text style={styles.contentText}>Hier sehen Sie Ihre bisherigen Bestellungen.</Text>
    </View>
  );
}

function GuthabenContent() {
  return (
    <View>
      <Text style={styles.balanceLabel}>Aktuelles Guthaben:</Text>
      <Text style={styles.balanceValue}>38,7€</Text>
      <View style={styles.divider} />
      <Text style={styles.balanceLabel}>Guthaben aufladen:</Text>
      <Text
        style={styles.link}
        onPress={() => Linking.openURL('https://www.sw-stuttgart.de/geld-laden')}
      >
        www.GeldAufladen.de
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2277bb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a5f99',
  },
  navBtnActive: {
    backgroundColor: '#18345d',
  },
  navIcon: {
    marginRight: 12,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  contentArea: {
    padding: 20,
    paddingTop: 24,
  },
  contentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 10,
  },
  contentText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 22,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginTop: 6,
  },
  balanceValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#18345d',
    marginTop: 4,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#dddddd',
    marginVertical: 18,
  },
  link: {
    fontSize: 15,
    color: '#0066cc',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
