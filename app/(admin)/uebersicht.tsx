import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Typen ───────────────────────────────────────────────────────────────────

type SpeiseplanEintrag = {
  id: number;
  Ausgabedatum: string;
  Gerichtname: string;
  Allergene: string;
  image_url: string;
};

type BestellungZahlen = {
  studierende: number;
  bedienstete: number;
  gaeste: number;
};

type FreieEssenRow = {
  id: string;
  speiseplan_id: number;
  datum: string;
  anzahl: number;
};

type VorschauTag = {
  datum: string;
  gericht: string;
  studierende: number;
  bedienstete: number;
  gaeste: number;
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function pad(n: number) { return String(n).padStart(2, '0'); }

function isoToGerman(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]}, ${pad(d)}.${pad(m)}.${y}`;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function getNextFiveWeekdays(): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (days.length < 5) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export default function Uebersicht() {
  const { profile, signOut } = useAuthContext();
  const today = todayIso();

  const [speiseplanHeute, setSpeiseplanHeute] = useState<SpeiseplanEintrag | null>(null);
  const [zahlen, setZahlen] = useState<BestellungZahlen>({ studierende: 0, bedienstete: 0, gaeste: 0 });
  const [freieEssen, setFreieEssen] = useState<FreieEssenRow | null>(null);
  const [verfalleneAnzahl, setVerfalleneAnzahl] = useState(0);
  const [loading, setLoading] = useState(true);

  // Freie Essen – lokale Bearbeitung
  const [lokaleAnzahl, setLokaleAnzahl] = useState(0);
  const [freiGeaendert, setFreiGeaendert] = useState(false);
  const [zeigeFreiBestätigung, setZeigeFreiBestätigung] = useState(false);
  const [freiSaving, setFreiSaving] = useState(false);

  // Vorschau
  const [vorschauOffen, setVorschauOffen] = useState(false);
  const [vorschauDaten, setVorschauDaten] = useState<VorschauTag[]>([]);
  const [vorschauLoading, setVorschauLoading] = useState(false);

  // Vollständiger Ladevorgang (einmalig beim Tab-Wechsel)
  const ladeDaten = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        supabase
          .from('Speiseplan')
          .select('id, Ausgabedatum, Gerichtname, Allergene, image_url')
          .eq('Ausgabedatum', today)
          .maybeSingle(),
        supabase
          .from('Bestellungen')
          .select('kategorie')
          .eq('bestell_datum', today)
          .or('status.eq.bestellt,status.is.null'),
        supabase
          .from('FreieEssen')
          .select('*')
          .eq('datum', today)
          .maybeSingle(),
        supabase
          .from('Bestellungen')
          .select('*', { count: 'exact', head: true })
          .eq('bestell_datum', today)
          .eq('status', 'nicht abgeholt'),
      ]);

      const spRes = results[0].status === 'fulfilled' ? (results[0] as any).value : null;
      const bestRes = results[1].status === 'fulfilled' ? (results[1] as any).value : null;
      const freiRes = results[2].status === 'fulfilled' ? (results[2] as any).value : null;
      const verfallenRes = results[3].status === 'fulfilled' ? (results[3] as any).value : null;

      const sp = spRes?.data ?? null;
      const bestellungen = bestRes?.data ?? [];
      const frei = freiRes?.data ?? null;
      const verfallen = verfallenRes?.count ?? 0;

      setSpeiseplanHeute(sp ?? null);

      const liste = (bestellungen ?? []) as { kategorie: string }[];
      setZahlen({
        studierende: liste.filter(b => b.kategorie === 'Studierende').length,
        bedienstete: liste.filter(b => b.kategorie === 'Bedienstete').length,
        gaeste: liste.filter(b => b.kategorie === 'Gäste').length,
      });

      const verfalleneHeute = verfallen ?? 0;
      setVerfalleneAnzahl(verfalleneHeute);

      // Auto-Sync: verfallene Bestellungen einmalig in FreieEssen übernehmen
      if (!frei && verfalleneHeute > 0 && sp) {
        await supabase.from('FreieEssen').insert({
          speiseplan_id: sp.id,
          datum: today,
          anzahl: verfalleneHeute,
        });
        const { data: freiNeu } = await supabase
          .from('FreieEssen').select('*').eq('datum', today).maybeSingle();
        setFreieEssen(freiNeu ?? null);
        setLokaleAnzahl(freiNeu?.anzahl ?? verfalleneHeute);
      } else {
        setFreieEssen(frei ?? null);
        setLokaleAnzahl(frei?.anzahl ?? 0);
      }

      setFreiGeaendert(false);
    } catch (err) {
      console.error('Error loading overview data:', err);
      setSpeiseplanHeute(null);
      setZahlen({ studierende: 0, bedienstete: 0, gaeste: 0 });
      setFreieEssen(null);
      setLokaleAnzahl(0);
      setVerfalleneAnzahl(0);
    } finally {
      setLoading(false);
    }
  }, [today]);

  // Nur die Bestellzahlen refreshen — kein Loading, kein Flimmern
  const ladeZahlen = useCallback(async () => {
    const { data: bestellungen } = await supabase
      .from('Bestellungen')
      .select('kategorie')
      .eq('bestell_datum', today)
      .or('status.eq.bestellt,status.is.null');

    const liste = (bestellungen ?? []) as { kategorie: string }[];
    setZahlen({
      studierende: liste.filter(b => b.kategorie === 'Studierende').length,
      bedienstete: liste.filter(b => b.kategorie === 'Bedienstete').length,
      gaeste: liste.filter(b => b.kategorie === 'Gäste').length,
    });
  }, [today]);

  useFocusEffect(useCallback(() => {
    ladeDaten();
    const interval = setInterval(ladeZahlen, 2000);
    return () => clearInterval(interval);
  }, [ladeDaten, ladeZahlen]));

  const handleMinus = () => {
    if (lokaleAnzahl <= 0) return;
    setLokaleAnzahl(v => v - 1);
    setFreiGeaendert(true);
  };

  const handleVerwerfen = () => {
    setLokaleAnzahl(freieEssen?.anzahl ?? 0);
    setFreiGeaendert(false);
  };

  const handleSpeichernBestaetigt = async () => {
    setZeigeFreiBestätigung(false);
    if (!speiseplanHeute) return;
    setFreiSaving(true);

    if (freieEssen) {
      await supabase.from('FreieEssen').update({ anzahl: lokaleAnzahl }).eq('id', freieEssen.id);
    } else {
      await supabase.from('FreieEssen').insert({
        speiseplan_id: speiseplanHeute.id,
        datum: today,
        anzahl: lokaleAnzahl,
      });
    }

    setFreiSaving(false);
    ladeDaten();
  };

  const ladeVorschau = async () => {
    setVorschauLoading(true);
    const tage = getNextFiveWeekdays();
    const [{ data: spDaten }, { data: bestDaten }] = await Promise.all([
      supabase.from('Speiseplan').select('Ausgabedatum, Gerichtname').in('Ausgabedatum', tage),
      supabase.from('Bestellungen').select('bestell_datum, kategorie').in('bestell_datum', tage),
    ]);

    setVorschauDaten(tage.map(datum => {
      const sp = (spDaten ?? []).find(s => s.Ausgabedatum === datum);
      const best = (bestDaten ?? []).filter(b => b.bestell_datum === datum);
      return {
        datum,
        gericht: sp?.Gerichtname ?? '–',
        studierende: best.filter(b => b.kategorie === 'Studierende').length,
        bedienstete: best.filter(b => b.kategorie === 'Bedienstete').length,
        gaeste: best.filter(b => b.kategorie === 'Gäste').length,
      };
    }));
    setVorschauLoading(false);
  };

  const toggleVorschau = () => {
    if (!vorschauOffen && vorschauDaten.length === 0) ladeVorschau();
    setVorschauOffen(v => !v);
  };

  const gesamt = zahlen.studierende + zahlen.bedienstete + zahlen.gaeste;

  return (
    <View style={styles.container}>
      <LogoHeader />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a4d1a" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* Admin-Info */}
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#1a4d1a" />
            <Text style={styles.adminName}>
              {profile?.['Vorname']} {profile?.['Nachname']} — Admin
            </Text>
          </View>

          {/* Vorbestellungen heute */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Noch nicht abgeholt heute</Text>
            <View style={styles.zahlenRow}>
              <ZahlChip label="Studierende" wert={zahlen.studierende} farbe="#1a6fbb" />
              <ZahlChip label="Bedienstete" wert={zahlen.bedienstete} farbe="#7a5c1e" />
              <ZahlChip label="Gäste"       wert={zahlen.gaeste}       farbe="#555555" />
            </View>
            <Text style={styles.gesamtText}>Gesamt: {gesamt} Essen</Text>
          </View>

          {/* Heutiges Gericht */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Heutiges Gericht — {isoToGerman(today)}</Text>
            {speiseplanHeute ? (
              <>
                {!!speiseplanHeute.image_url && (
                  <Image
                    source={{ uri: speiseplanHeute.image_url }}
                    style={styles.gerichtBild}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.gerichtName}>{speiseplanHeute.Gerichtname}</Text>
                {!!speiseplanHeute.Allergene && (
                  <View style={styles.allergenBox}>
                    <Text style={styles.allergenLabel}>Allergene</Text>
                    <Text style={styles.allergenText}>{speiseplanHeute.Allergene}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>Kein Speiseplan für heute hinterlegt.</Text>
            )}
          </View>

          {/* Freie Essen */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Freie Essen zur Vergabe</Text>
            <View style={styles.freiRow}>
              <Text style={styles.freiAnzahl}>{lokaleAnzahl}</Text>
              <TouchableOpacity
                style={[styles.minusBtn, lokaleAnzahl <= 0 && styles.btnDisabled]}
                onPress={handleMinus}
                disabled={lokaleAnzahl <= 0}
              >
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {verfalleneAnzahl > 0 && (
              <Text style={styles.freiHinweis}>
                ↩ {verfalleneAnzahl} nicht abgeholte Vorbestellung{verfalleneAnzahl !== 1 ? 'en' : ''} automatisch übernommen
              </Text>
            )}

            {freiGeaendert && (
              <View style={styles.freiAktionen}>
                <TouchableOpacity style={styles.verwerfenBtn} onPress={handleVerwerfen}>
                  <Text style={styles.verwerfenText}>Verwerfen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.speichernBtn, freiSaving && styles.btnDisabled]}
                  onPress={() => setZeigeFreiBestätigung(true)}
                  disabled={freiSaving}
                >
                  {freiSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.speichernText}>Speichern</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Vorschau nächste 5 Tage */}
          <TouchableOpacity style={styles.vorschauHeader} onPress={toggleVorschau}>
            <Text style={styles.vorschauLabel}>Vorschau nächste 5 Tage</Text>
            <Ionicons name={vorschauOffen ? 'chevron-up' : 'chevron-down'} size={18} color="#1a4d1a" />
          </TouchableOpacity>

          {vorschauOffen && (
            vorschauLoading
              ? <ActivityIndicator color="#1a4d1a" style={{ marginTop: 12 }} />
              : vorschauDaten.map(tag => (
                <View key={tag.datum} style={styles.vorschauCard}>
                  <Text style={styles.vorschauDatum}>{isoToGerman(tag.datum)}</Text>
                  <Text style={styles.vorschauGericht}>{tag.gericht}</Text>
                  <Text style={styles.vorschauZahlen}>
                    Stud.: {tag.studierende} · Bed.: {tag.bedienstete} · Gäste: {tag.gaeste}
                  </Text>
                </View>
              ))
          )}

          {/* Abmelden */}
          <TouchableOpacity style={styles.abmeldenBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color="#cc3333" />
            <Text style={styles.abmeldenText}>Abmelden</Text>
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* Bestätigungs-Dialog: Freie Essen speichern */}
      <Modal transparent visible={zeigeFreiBestätigung} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitel}>Änderung bestätigen</Text>
            <Text style={styles.dialogText}>
              Freie Essen auf <Text style={styles.dialogBold}>{lokaleAnzahl}</Text> setzen?
            </Text>
            <Text style={styles.dialogHinweis}>
              Bisher: {freieEssen?.anzahl ?? 0} Essen
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogAbbrechenBtn}
                onPress={() => setZeigeFreiBestätigung(false)}
              >
                <Text style={styles.dialogAbbrechenText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBestaetigenBtn}
                onPress={handleSpeichernBestaetigt}
              >
                <Text style={styles.dialogBestaetigenText}>Bestätigen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Hilfskomponente ─────────────────────────────────────────────────────────

function ZahlChip({ label, wert, farbe }: { label: string; wert: number; farbe: string }) {
  return (
    <View style={[styles.zahlChip, { borderColor: farbe }]}>
      <Text style={[styles.zahlWert, { color: farbe }]}>{wert}</Text>
      <Text style={[styles.zahlLabel, { color: farbe }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#ffffff' },
  scrollContent:{ padding: 14, paddingBottom: 130 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a8c8a0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
  },
  adminName: { fontSize: 13, fontWeight: '600', color: '#1a4d1a' },

  card: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#a8c8a0',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5a8a5a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  zahlenRow:  { flexDirection: 'row', gap: 8, marginBottom: 8 },
  zahlChip:   { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  zahlWert:   { fontSize: 22, fontWeight: '700' },
  zahlLabel:  { fontSize: 10, fontWeight: '600', marginTop: 2 },
  gesamtText: { fontSize: 13, fontWeight: '700', color: '#333' },

  gerichtBild: { width: '100%', height: 160, borderRadius: 6, marginBottom: 10 },
  gerichtName: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 8 },
  emptyText:   { fontSize: 13, color: '#888' },

  allergenBox:   { backgroundColor: '#fff8e6', borderRadius: 6, borderWidth: 1, borderColor: '#e6cc88', padding: 10 },
  allergenLabel: { fontSize: 11, fontWeight: '700', color: '#886600', marginBottom: 2 },
  allergenText:  { fontSize: 13, color: '#554400', lineHeight: 18 },

  freiRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  freiAnzahl: { fontSize: 36, fontWeight: '700', color: '#1a4d1a', minWidth: 48 },
  minusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a4d1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },

  freiHinweis: { fontSize: 12, color: '#5a8a5a', marginTop: 8, fontStyle: 'italic' },
  freiAktionen: { flexDirection: 'row', gap: 10, marginTop: 14 },
  verwerfenBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#aaa',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verwerfenText: { fontSize: 14, color: '#555' },
  speichernBtn: {
    flex: 1,
    backgroundColor: '#1a4d1a',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  speichernText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  vorschauHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 4,
    marginBottom: 4,
  },
  vorschauLabel: { fontSize: 14, fontWeight: '700', color: '#1a4d1a' },
  vorschauCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c8e6c8',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f6fbf6',
  },
  vorschauDatum:  { fontSize: 12, fontWeight: '700', color: '#1a4d1a', marginBottom: 2 },
  vorschauGericht:{ fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 4 },
  vorschauZahlen: { fontSize: 12, color: '#666' },

  abmeldenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cc3333',
  },
  abmeldenText: { fontSize: 14, fontWeight: '700', color: '#cc3333' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  dialogTitel:        { fontSize: 16, fontWeight: '700', color: '#1a4d1a', marginBottom: 10 },
  dialogText:         { fontSize: 15, color: '#222', marginBottom: 4 },
  dialogBold:         { fontWeight: '700' },
  dialogHinweis:      { fontSize: 13, color: '#888', marginBottom: 20 },
  dialogButtons:      { flexDirection: 'row', gap: 10 },
  dialogAbbrechenBtn: { flex: 1, borderWidth: 1.5, borderColor: '#aaa', borderRadius: 6, paddingVertical: 11, alignItems: 'center' },
  dialogAbbrechenText:{ fontSize: 14, color: '#555' },
  dialogBestaetigenBtn:  { flex: 1, backgroundColor: '#1a4d1a', borderRadius: 6, paddingVertical: 11, alignItems: 'center' },
  dialogBestaetigenText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
