import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function isoToGerman(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]}, ${pad(d)}.${pad(m)}.${y}`;
}

type Mahlzeit = {
  id: number;
  Ausgabedatum: string;
  Gerichtname: string;
  Allergene: string;
  PreisStudierende: string;
  PreisBedienstet: string;
  PreisGast: string;
  image_url: string;
  ernaehrungstyp?: 'vegan' | 'vegetarisch' | 'nicht vegetarisch' | null;
};

function ernBadgeColor(typ: string) {
  if (typ === 'vegan')       return { backgroundColor: '#2a7a2a' };
  if (typ === 'vegetarisch') return { backgroundColor: '#5a8a2a' };
  return { backgroundColor: '#888' };
}

function PreisSektion({ label, preis, color }: { label: string; preis: string; color: string }) {
  return (
    <View style={[styles.preisChip, { borderColor: color }]}>
      <Text style={[styles.preisChipLabel, { color }]}>{label}</Text>
      <Text style={[styles.preisChipWert, { color }]}>{preis}</Text>
    </View>
  );
}

function MahlzeitKarte({ meal }: { meal: Mahlzeit }) {
  return (
    <View style={styles.mealBlock}>
      {!!meal.image_url && (
        <Image
          source={{ uri: meal.image_url }}
          style={styles.mealImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.mealNameRow}>
        <Text style={styles.mealName}>{meal.Gerichtname}</Text>
        {!!meal.ernaehrungstyp && meal.ernaehrungstyp !== 'nicht vegetarisch' && (
          <View style={[styles.ernaehrungBadge, ernBadgeColor(meal.ernaehrungstyp)]}>
            <Text style={styles.ernaehrungText}>{meal.ernaehrungstyp}</Text>
          </View>
        )}
      </View>
      {!!meal.Allergene && (
        <Text style={styles.allergenText}>Allergene: {meal.Allergene}</Text>
      )}
      <View style={styles.preisSektionen}>
        <PreisSektion label="Studierende" preis={meal.PreisStudierende} color="#1a6fbb" />
        <PreisSektion label="Bedienstete" preis={meal.PreisBedienstet}  color="#7a5c1e" />
        <PreisSektion label="Gäste"       preis={meal.PreisGast}         color="#555555" />
      </View>
    </View>
  );
}

export default function Speiseplan() {
  const { bookingStatus, activeAbo } = useAuthContext();
  const [mahlzeiten, setMahlzeiten] = useState<Mahlzeit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('Speiseplan')
      .select('*')
      .gte('Ausgabedatum', today)
      .order('Ausgabedatum', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError('Speiseplan konnte nicht geladen werden.');
        else setMahlzeiten((data ?? []) as Mahlzeit[]);
        setLoading(false);
      });
  }, []);

  const grouped = mahlzeiten.reduce<Record<string, Mahlzeit[]>>((acc, m) => {
    if (!acc[m.Ausgabedatum]) acc[m.Ausgabedatum] = [];
    acc[m.Ausgabedatum].push(m);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <LogoHeader showDateTime bookingStatus={bookingStatus} activeAbo={activeAbo} />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Speiseplan wird geladen…</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {Object.keys(grouped).length === 0 ? (
            <Text style={styles.emptyText}>Kein Speiseplan verfügbar.</Text>
          ) : (
            Object.entries(grouped).map(([date, meals]) => (
              <View key={date} style={styles.card}>
                <Text style={styles.dateText}>{isoToGerman(date)}</Text>
                {meals.map((meal) => (
                  <MahlzeitKarte key={meal.id} meal={meal} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#666666' },
  errorText: { fontSize: 14, color: '#cc0000', textAlign: 'center', padding: 20 },
  emptyText: { fontSize: 14, color: '#666666', textAlign: 'center', marginTop: 40 },
  scrollContent: { padding: 14, paddingBottom: 110 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#99bbdd',
    padding: 12,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0055cc',
    marginBottom: 10,
  },
  mealBlock: { marginBottom: 12 },
  mealImage: {
    width: '100%',
    height: 160,
    borderRadius: 6,
    marginBottom: 8,
  },
  mealName: { fontSize: 15, fontWeight: '700', color: '#222222' },
  allergenText: { fontSize: 12, color: '#888888', marginBottom: 6 },

  mealNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  ernaehrungBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  ernaehrungText:  { fontSize: 10, fontWeight: '700', color: '#fff' },

  preisSektionen: { flexDirection: 'row', gap: 5, marginTop: 6 },
  preisChip: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    flexWrap: 'nowrap',
  },
  preisChipLabel: { fontSize: 9, fontWeight: '700', flexShrink: 1 },
  preisChipWert:  { fontSize: 10, fontWeight: '700', flexShrink: 0 },
});
