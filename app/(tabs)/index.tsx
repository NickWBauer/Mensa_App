import LogoHeader from '@/components/logo-header';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://sws2.maxmanager.xyz/inc/ajax-php_konnektor.inc.php';
const LOC_ID = '13';
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + n));
}

function getMonday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
  return toIso(new Date(y, m - 1, d + diff));
}

function toGermanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]}, ${pad(d)}.${pad(m)}.${y}`;
}

// Mon–Fri of current week; on Sat/Sun jumps to next week
function getDisplayDates(): string[] {
  const today = toIso(new Date());
  const dow = new Date().getDay();
  const baseMonday = getMonday(today);
  const monday = (dow === 0 || dow === 6) ? addDays(baseMonday, 7) : baseMonday;
  return [0, 1, 2, 3, 4].map(i => addDays(monday, i));
}

type RawMeal = { name: string; category: string };
type MealDay = { date: string; dateLabel: string; meals: RawMeal[]; ordered: boolean; isPast: boolean };

function parseHtml(html: string): RawMeal[] {
  const results: RawMeal[] = [];
  const sections = html.split("row gruppenkopf'>");

  for (let s = 1; s < sections.length; s++) {
    const section = sections[s];
    const catMatch = section.match(/gruppenname[^>]*>([^<]+)</);
    if (!catMatch) continue;
    const category = catMatch[1].trim();

    const mealParts = section.split("class='row splMeal'");
    for (let m = 1; m < mealParts.length; m++) {
      const block = mealParts[m];
      const nameMatch = block.match(/font-size:1\.5em[^>]*>([^<]+)</);
      const name = nameMatch?.[1]?.trim();
      if (name) results.push({ name, category });
    }
  }

  return results;
}

async function fetchDay(date: string): Promise<RawMeal[]> {
  const monday = getMonday(date);
  const nextMonday = addDays(monday, 7);
  const body = `func=make_spl&locId=${LOC_ID}&date=${date}&lang=de&startThisWeek=${monday}&startNextWeek=${nextMonday}`;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  });
  return parseHtml(await res.text());
}

async function loadSpeiseplan(): Promise<MealDay[]> {
  const today = toIso(new Date());
  const dates = getDisplayDates();

  const results = await Promise.all(
    dates.map(async date => {
      try {
        const meals = await fetchDay(date);
        if (!meals.length) return null;
        return { date, dateLabel: toGermanDate(date), meals, ordered: false, isPast: date < today };
      } catch {
        return null;
      }
    })
  );

  return (results.filter(Boolean) as MealDay[]).sort((a, b) => a.date.localeCompare(b.date));
}

function PriceRow() {
  return (
    <View style={styles.priceRow}>
      <View style={[styles.priceChip, { borderColor: '#1a6fbb' }]}>
        <Text style={[styles.priceLabel, { color: '#1a6fbb' }]}>Studi: 5,40 €</Text>
      </View>
      <View style={[styles.priceChip, { borderColor: '#7a5c1e' }]}>
        <Text style={[styles.priceLabel, { color: '#7a5c1e' }]}>Bed.: 8,40 €</Text>
      </View>
      <View style={[styles.priceChip, { borderColor: '#555555' }]}>
        <Text style={[styles.priceLabel, { color: '#555555' }]}>Gast: 8,90 €</Text>
      </View>
    </View>
  );
}

export default function Speiseplan() {
  const [days, setDays] = useState<MealDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSpeiseplan()
      .then(setDays)
      .catch(() => setError('Speiseplan konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const order = (date: string) =>
    setDays(prev => prev.map(d => d.date === date ? { ...d, ordered: true } : d));

  const cancel = (date: string) =>
    setDays(prev => prev.map(d => d.date === date ? { ...d, ordered: false } : d));

  return (
    <View style={styles.container}>
      <LogoHeader />

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
          {days.map(day => (
            <View key={day.date} style={[styles.card, day.isPast && styles.cardPast]}>
              <Text style={[styles.dateText, day.isPast && styles.dateTextPast]}>
                {day.dateLabel}
              </Text>
              {day.meals.map((meal, i) => (
                <View key={i} style={styles.mealBlock}>
                  <Text style={[styles.mealLine, day.isPast && styles.mealLinePast]}>
                    {meal.name}
                  </Text>
                  <PriceRow />
                </View>
              ))}
              {!day.isPast && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.btn, day.ordered ? styles.btnOrdered : styles.btnDefault]}
                    onPress={() => order(day.date)}
                    disabled={day.ordered}
                  >
                    <Text style={[styles.btnText, day.ordered && styles.btnTextOrdered]}>
                      Vorbestellt
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, day.ordered ? styles.btnStornieren : styles.btnDefault]}
                    onPress={() => cancel(day.date)}
                  >
                    <Text style={[styles.btnText, day.ordered && styles.btnTextStornieren]}>
                      Stornieren
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
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
  scrollContent: { padding: 14, paddingBottom: 110 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#99bbdd',
    padding: 12,
    marginBottom: 10,
  },
  cardPast: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cccccc',
    padding: 12,
    marginBottom: 10,
  },

  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0055cc',
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  dateTextPast: {
    color: '#777777',
    textDecorationLine: 'none',
  },

  mealBlock: { marginBottom: 8 },
  mealLine: { fontSize: 13, color: '#222222', lineHeight: 19, marginBottom: 3 },
  mealLinePast: { fontSize: 13, color: '#666666', lineHeight: 19, marginBottom: 3 },

  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 2 },
  priceChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceLabel: { fontSize: 11, fontWeight: '600' },

  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 7, borderRadius: 6, borderWidth: 1.5, alignItems: 'center' },
  btnDefault: { borderColor: '#aaaaaa', backgroundColor: '#ffffff' },
  btnOrdered: { borderColor: '#66bb66', backgroundColor: '#e8f8e8' },
  btnStornieren: { borderColor: '#dd8888', backgroundColor: '#fceaea' },
  btnText: { fontSize: 12, fontWeight: '600', color: '#444444' },
  btnTextOrdered: { color: '#338833' },
  btnTextStornieren: { color: '#bb4444' },
});
