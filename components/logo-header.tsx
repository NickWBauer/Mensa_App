import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAY_SHORT: Record<number, string> = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr' };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export type BookingStatus = 'gruen' | 'orange' | 'rot';

export type ActiveAboInfo = {
  aktiv: boolean;
  wochentage: number[];
  ausgeschlossene_allergene: string[];
  vegetarisch: boolean;
  vegan: boolean;
  nutzertyp: 'Studierende' | 'Bedienstete' | 'Externe';
} | null;

type LogoHeaderProps = {
  showDateTime?: boolean;
  bookingStatus?: BookingStatus | null;
  onSignOut?: () => void;
  activeAbo?: ActiveAboInfo;
};

const STATUS_CONFIG: Record<BookingStatus, { color: string; label: string }> = {
  gruen:  { color: '#2a9d2a', label: 'Vorbestellt' },
  orange: { color: '#e07b00', label: 'Ausgabe läuft' },
  rot:    { color: '#cc2222', label: 'Keine aktive Bestellung' },
};

function formatAboLabel(abo: NonNullable<ActiveAboInfo>): string {
  const parts: string[] = [];
  const tage = abo.wochentage.map(d => WEEKDAY_SHORT[d]).filter(Boolean).join(' · ');
  if (tage) parts.push(tage);
  if (abo.vegan) parts.push('vegan');
  else if (abo.vegetarisch) parts.push('vegetarisch');
  if (abo.ausgeschlossene_allergene.length > 0) {
    parts.push(`ohne ${abo.ausgeschlossene_allergene.join(', ')}`);
  }
  return parts.join(' · ');
}

const STATUS_CYCLE: BookingStatus[] = ['rot', 'gruen', 'orange'];

export default function LogoHeader({ showDateTime, bookingStatus, onSignOut, activeAbo }: LogoHeaderProps) {
  const [now, setNow] = useState(new Date());
  const [demoStatus, setDemoStatus] = useState<BookingStatus | null>(null);

  useEffect(() => {
    if (!showDateTime) return;
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, [showDateTime]);

  const dateTimeLabel = `${WEEKDAYS_SHORT[now.getDay()]}, ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}  ${pad(now.getHours())}:${pad(now.getMinutes())} Uhr`;

  const effectiveStatus = demoStatus ?? bookingStatus;
  const statusCfg = effectiveStatus ? STATUS_CONFIG[effectiveStatus] : null;
  const aboLabel = activeAbo?.aktiv ? formatAboLabel(activeAbo) : null;

  const handleStatusLongPress = () => {
    if (!bookingStatus) return;
    setDemoStatus(prev => {
      const current = prev ?? bookingStatus;
      const idx = STATUS_CYCLE.indexOf(current);
      return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    });
  };

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
          <Text style={styles.dateTimeText} numberOfLines={1}>{dateTimeLabel}</Text>
          {statusCfg && (
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}
              onLongPress={handleStatusLongPress}
              delayLongPress={600}
              activeOpacity={0.8}
            >
              <Text style={styles.statusText} numberOfLines={1}>{statusCfg.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showDateTime && activeAbo?.aktiv && (
        <View style={styles.aboRow}>
          <Ionicons name="repeat-outline" size={12} color="#1a5090" />
          <Text style={styles.aboText} numberOfLines={1}>
            {aboLabel ? `Abo aktiv: ${aboLabel}` : 'Abo aktiv'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: 4,
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
  logo1: { width: 130, height: 60, resizeMode: 'contain' },
  logo2: { width: 105, height: 55, resizeMode: 'contain' },

  signOutBtn: {
    backgroundColor: '#e47676',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  signOutText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  infoRow: {
    marginTop: 4,
    paddingTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexWrap: 'nowrap',
    gap: 8,
  },
  dateTimeText: { fontSize: 12, color: '#333333', fontWeight: '600', flex: 1 },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  aboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    marginBottom: 2,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  aboText: {
    flex: 1,
    fontSize: 11,
    color: '#1a5090',
    fontWeight: '600',
  },
});
