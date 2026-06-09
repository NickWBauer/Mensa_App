import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export type BookingStatus = 'gruen' | 'orange' | 'rot';

type LogoHeaderProps = {
  showDateTime?: boolean;
  bookingStatus?: BookingStatus | null;
  onSignOut?: () => void;
};

const STATUS_CONFIG: Record<BookingStatus, { color: string; label: string }> = {
  gruen:  { color: '#2a9d2a', label: 'Vorbestellt' },
  orange: { color: '#e07b00', label: 'Ausgabe läuft' },
  rot:    { color: '#cc2222', label: 'Keine aktive Bestellung' },
};

export default function LogoHeader({ showDateTime, bookingStatus, onSignOut }: LogoHeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!showDateTime) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [showDateTime]);

  const dateTimeLabel = `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}  ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const statusCfg = bookingStatus ? STATUS_CONFIG[bookingStatus] : null;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.logoRow}>
        <Image
          source={require('@/assets/images/Logo_Studierendenwerk_Stuttgart.png')}
          style={styles.logo1}
        />
        <Image
          source={require('@/assets/images/Logo_Hs_Esslingen.jpg')}
          style={styles.logo2}
        />
        {onSignOut && (
          <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
            <Text style={styles.signOutText}>Abmelden</Text>
          </TouchableOpacity>
        )}
      </View>

      {showDateTime && (
        <View style={styles.infoRow}>
          <Text style={styles.dateTimeText}>{dateTimeLabel}</Text>
          {statusCfg && (
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}>
              <Text style={styles.statusText}>{statusCfg.label}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  logo1: { width: 150, height: 100, resizeMode: 'contain' },
  logo2: { width: 120, height: 90,  resizeMode: 'contain' },

  signOutBtn: {
    backgroundColor: '#e47676',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  signOutText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  infoRow: {
    marginTop: 10,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateTimeText: { fontSize: 14, color: '#333333', fontWeight: '600' },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
});
