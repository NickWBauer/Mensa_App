import LogoHeader from '@/components/logo-header';
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
};

export default function Speiseplan() {
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
      <LogoHeader showDateTime />

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
                  <View key={meal.id} style={styles.mealBlock}>
                    {!!meal.image_url && (
                      <Image
                        source={{ uri: meal.image_url }}
                        style={styles.mealImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={styles.mealName}>{meal.Gerichtname}</Text>
                    {!!meal.Allergene && (
                      <Text style={styles.allergenText}>Allergene: {meal.Allergene}</Text>
                    )}
                    <View style={styles.priceRow}>
                      <PriceChip label="Studierende" value={meal.PreisStudierende} color="#1a6fbb" />
                      <PriceChip label="Bedienstete" value={meal.PreisBedienstet} color="#7a5c1e" />
                      <PriceChip label="Gäste" value={meal.PreisGast} color="#555555" />
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function PriceChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.priceChip, { borderColor: color }]}>
      <Text style={[styles.priceLabel, { color }]}>{label}: {value}</Text>
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
  mealName: { fontSize: 15, fontWeight: '700', color: '#222222', marginBottom: 4 },
  allergenText: { fontSize: 12, color: '#888888', marginBottom: 6 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  priceChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceLabel: { fontSize: 11, fontWeight: '600' },
});
