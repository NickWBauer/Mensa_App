import LogoHeader, { BookingStatus } from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ALLE_ALLERGENE = ['Gluten', 'Milch', 'Ei', 'Fisch', 'Sellerie', 'Senf', 'Nüsse', 'Soja', 'Sesam'];
const MAX_BESTELLUNGEN = 3;

function pad(n: number) { return String(n).padStart(2, '0'); }

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isoToGerman(iso: string): string {
  const d = isoToDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function isoToShort(iso: string): string {
  const d = isoToDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function nextWeekdayIso(): string {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().split('T')[0];
}

/** Montag bis Freitag der übernächsten Woche */
function getUebernachsteWoche(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const daysToMonday = dow === 0 ? 1 : 8 - dow;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToMonday + 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function preisToNumber(preis: string): number {
  return parseFloat(preis.replace('€', '').replace(',', '.').trim()) || 0;
}

/** Berechnet den Buchungs-Status basierend auf Bestellungen und aktueller Uhrzeit */
function computeBookingStatus(rows: BestellungRow[]): BookingStatus {
  const now = new Date();
  const today = todayIso();

  const pickupStart = new Date(); pickupStart.setHours(11, 0, 0, 0);
  const pickupEnd   = new Date(); pickupEnd.setHours(13, 15, 0, 0);

  const isInPickupWindow = now >= pickupStart && now < pickupEnd;
  const isPickupOver     = now >= pickupEnd;

  const nextDate = isPickupOver ? nextWeekdayIso() : today;
  const hasBooking = rows.some(
    r => r.bestell_datum === nextDate && (r.status === 'bestellt' || !r.status),
  );

  if (isInPickupWindow && hasBooking) return 'orange';
  if (hasBooking) return 'gruen';
  return 'rot';
}

/** Matching-Logik: Gibt true zurück wenn das Gericht die Abo-Kriterien erfüllt */
function matchesAbo(abo: AboSettings, meal: SpeiseplanEintrag): boolean {
  if (abo.ausgeschlossene_allergene.length > 0 && meal.Allergene) {
    const mealAllergene = meal.Allergene.split(',').map(a => a.trim().toLowerCase());
    for (const a of abo.ausgeschlossene_allergene) {
      if (mealAllergene.includes(a.toLowerCase())) return false;
    }
  }
  if (abo.vegetarisch && meal.ernaehrungstyp === 'nicht vegetarisch') return false;
  return true;
}

// ─── Typen ───────────────────────────────────────────────────────────────────

type SubTab = 'vorbestellung' | 'meine' | 'abo';

type SpeiseplanEintrag = {
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

type Mengenwahl = { studierende: number; bedienstete: number; gaeste: number };

type BestellungRow = {
  id: number;
  email: string;
  gericht_name: string;
  bestell_datum: string;
  kategorie: string;
  preis: string;
  image_url: string;
  auth_user_id?: string | null;
  status?: 'bestellt' | 'abgeholt' | 'verfallen' | 'storniert';
};

type BestellungGruppe = {
  key: string;
  gericht_name: string;
  bestell_datum: string;
  image_url: string;
  anzahl_studierende: number;
  preis_studierende: string;
  anzahl_bedienstete: number;
  preis_bedienstete: string;
  anzahl_gaeste: number;
  preis_gaeste: string;
  gesamt: string;
  isPast: boolean;
};

type AboSettings = {
  aktiv: boolean;
  // 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr
  wochentage: number[];
  ausgeschlossene_allergene: string[];
  vegetarisch: boolean;
};

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export default function Bestellungen() {
  const { profile, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState<SubTab>('vorbestellung');
  const [bookingRows, setBookingRows] = useState<BestellungRow[]>([]);

  const email = profile?.['E-Mail'] as string | undefined;

  // Status-Fetch: nur aktuelle + zukünftige Bestellungen laden
  useEffect(() => {
    if (!email) return;
    supabase
      .from('Bestellungen')
      .select('id, bestell_datum, status')
      .eq('email', email)
      .gte('bestell_datum', todayIso())
      .then(({ data }) => setBookingRows((data ?? []) as BestellungRow[]));
  }, [email]);

  const status = computeBookingStatus(bookingRows);

  return (
    <View style={styles.container}>
      <LogoHeader showDateTime bookingStatus={status} onSignOut={signOut} />

      <View style={styles.navBar}>
        <NavItem label="Vorbestellung"    active={activeTab === 'vorbestellung'} onPress={() => setActiveTab('vorbestellung')} />
        <NavItem label="Meine Bestellungen" active={activeTab === 'meine'}       onPress={() => setActiveTab('meine')} />
        <NavItem label="Bestellabo"       active={activeTab === 'abo'}           onPress={() => setActiveTab('abo')} />
      </View>

      {activeTab === 'vorbestellung' && <VorbestellungContent />}
      {activeTab === 'meine'         && <MeineBestellungenContent onBookingsChanged={rows => setBookingRows(rows)} />}
      {activeTab === 'abo'           && <AboContent />}
    </View>
  );
}

function NavItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.navBtn, active && styles.navBtnActive]} onPress={onPress}>
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Vorbestellung ────────────────────────────────────────────────────────────

function VorbestellungContent() {
  const { profile } = useAuthContext();
  const [speiseplan, setSpeiseplan] = useState<SpeiseplanEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mengen, setMengen] = useState<Record<number, Mengenwahl>>({});

  const scrollRef = useRef<ScrollView>(null);
  const prevCartLengthRef = useRef(0);
  const wochentage = getUebernachsteWoche();

  useEffect(() => {
    if (wochentage.length === 0) return;
    supabase
      .from('Speiseplan')
      .select('*')
      .gte('Ausgabedatum', wochentage[0])
      .lte('Ausgabedatum', wochentage[4])
      .order('Ausgabedatum', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError('Speiseplan konnte nicht geladen werden.');
        else setSpeiseplan((data ?? []) as SpeiseplanEintrag[]);
        setLoading(false);
      });
  }, []);

  const gesamtAnzahl = Object.values(mengen).reduce(
    (sum, w) => sum + w.studierende + w.bedienstete + w.gaeste, 0,
  );

  const setMenge = (mealId: number, kat: keyof Mengenwahl, delta: number) => {
    if (delta > 0 && gesamtAnzahl >= MAX_BESTELLUNGEN) return;
    setMengen(prev => {
      const curr = prev[mealId] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
      return { ...prev, [mealId]: { ...curr, [kat]: Math.max(0, curr[kat] + delta) } };
    });
  };

  const cartItems = speiseplan.filter(m => {
    const w = mengen[m.id];
    return w && (w.studierende + w.bedienstete + w.gaeste) > 0;
  });

  useEffect(() => {
    if (cartItems.length > 0 && prevCartLengthRef.current === 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    prevCartLengthRef.current = cartItems.length;
  }, [cartItems.length]);

  const gesamtpreis = cartItems.reduce((sum, m) => {
    const w = mengen[m.id]!;
    return sum
      + w.studierende * preisToNumber(m.PreisStudierende)
      + w.bedienstete * preisToNumber(m.PreisBedienstet)
      + w.gaeste      * preisToNumber(m.PreisGast);
  }, 0);

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      const email = profile?.['E-Mail'] as string | undefined;
      if (!email) { setError('Keine E-Mail-Adresse gefunden.'); return; }

      const authResult = await supabase.auth.getUser();
      const authUserId = authResult.data?.user?.id ?? null;

      const rows: Omit<BestellungRow, 'id'>[] = [];
      for (const meal of cartItems) {
        const w = mengen[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        for (let i = 0; i < w.studierende; i++)
          rows.push({ email, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum, kategorie: 'Studierende', preis: meal.PreisStudierende, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt' });
        for (let i = 0; i < w.bedienstete; i++)
          rows.push({ email, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum, kategorie: 'Bedienstete', preis: meal.PreisBedienstet, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt' });
        for (let i = 0; i < w.gaeste; i++)
          rows.push({ email, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum, kategorie: 'Gäste', preis: meal.PreisGast, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt' });
      }
      if (rows.length === 0) return;
      if (rows.length > MAX_BESTELLUNGEN) {
        setError(`Maximal ${MAX_BESTELLUNGEN} Bestellungen pro Person erlaubt.`);
        return;
      }

      const { error: insertError } = await supabase.from('Bestellungen').insert(rows);
      if (insertError) setError(`Bestellung konnte nicht gespeichert werden. (${insertError.message})`);
      else { setMengen({}); setSuccess(true); }
    } catch (e: any) {
      setError(`Fehler: ${e?.message ?? 'Unbekannter Fehler'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Bestellung aufgegeben!</Text>
          <Text style={styles.successText}>
            Ihre Vorbestellung wurde erfolgreich gespeichert. Sie können die Bestellung unter „Meine Bestellungen" einsehen.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setSuccess(false)}>
            <Text style={styles.primaryBtnText}>Weitere Bestellung aufgeben</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const wocheStart = wochentage[0];
  const wocheEnde  = wochentage[4];
  const wocheLabel = `${isoToDate(wocheStart).getDate()}.${pad(isoToDate(wocheStart).getMonth() + 1)} – ${isoToDate(wocheEnde).getDate()}.${pad(isoToDate(wocheEnde).getMonth() + 1)}.${isoToDate(wocheEnde).getFullYear()}`;

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Vorbestellung</Text>
      <Text style={styles.infoText}>Zeitraum: {wocheLabel}</Text>

      {/* Bestellzähler – immer sichtbar sobald Speiseplan geladen */}
      {!loading && (
        <View style={[styles.zaehlerBar, gesamtAnzahl >= MAX_BESTELLUNGEN && styles.zaehlerBarVoll]}>
          <Text style={styles.zaehlerText}>
            {gesamtAnzahl}/{MAX_BESTELLUNGEN} Bestellungen genutzt
          </Text>
          {gesamtAnzahl >= MAX_BESTELLUNGEN && (
            <Text style={styles.zaehlerLimit}>Maximale Anzahl erreicht</Text>
          )}
        </View>
      )}

      {cartItems.length > 0 && (
        <View style={styles.cartBox}>
          <Text style={styles.cartTitle}>Ihre Auswahl:</Text>
          {cartItems.map(m => {
            const w = mengen[m.id]!;
            return (
              <View key={m.id} style={{ marginBottom: 2 }}>
                {w.studierende > 0 && <Text style={styles.cartLine}>{w.studierende}× {m.Gerichtname} – Studierende ({isoToShort(m.Ausgabedatum)})</Text>}
                {w.bedienstete > 0 && <Text style={styles.cartLine}>{w.bedienstete}× {m.Gerichtname} – Bedienstete ({isoToShort(m.Ausgabedatum)})</Text>}
                {w.gaeste > 0      && <Text style={styles.cartLine}>{w.gaeste}× {m.Gerichtname} – Gäste ({isoToShort(m.Ausgabedatum)})</Text>}
              </View>
            );
          })}
          <Text style={styles.cartGesamt}>Gesamt: {gesamtpreis.toFixed(2).replace('.', ',')} €</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={() => setShowConfirm(true)}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Bestellung abschicken</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator color="#0066cc" style={{ marginTop: 20 }} />}
      {!!error  && <Text style={styles.errorText}>{error}</Text>}
      {!loading && speiseplan.length === 0 && (
        <Text style={styles.emptyText}>Für diesen Zeitraum ist noch kein Speiseplan hinterlegt.</Text>
      )}

      {speiseplan.map(meal => {
        const w = mengen[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        return (
          <View key={meal.id} style={styles.card}>
            <Text style={styles.dateLabel}>{isoToGerman(meal.Ausgabedatum)}</Text>
            {!!meal.image_url && <Image source={{ uri: meal.image_url }} style={styles.mealImage} resizeMode="cover" />}
            <Text style={styles.mealName}>{meal.Gerichtname}</Text>
            {!!meal.Allergene && <Text style={styles.allergenText}>Allergene: {meal.Allergene}</Text>}
            {!!meal.ernaehrungstyp && (
              <View style={[styles.ernaehrungBadge, ernBadgeColor(meal.ernaehrungstyp)]}>
                <Text style={styles.ernaehrungText}>{meal.ernaehrungstyp}</Text>
              </View>
            )}
            <View style={styles.mengenBlock}>
              <MengeRow label="Studierende" preis={meal.PreisStudierende} wert={w.studierende} maxReached={gesamtAnzahl >= MAX_BESTELLUNGEN} onPlus={() => setMenge(meal.id, 'studierende', 1)} onMinus={() => setMenge(meal.id, 'studierende', -1)} />
              <MengeRow label="Bedienstete" preis={meal.PreisBedienstet}  wert={w.bedienstete} maxReached={gesamtAnzahl >= MAX_BESTELLUNGEN} onPlus={() => setMenge(meal.id, 'bedienstete', 1)} onMinus={() => setMenge(meal.id, 'bedienstete', -1)} />
              <MengeRow label="Gäste"       preis={meal.PreisGast}        wert={w.gaeste}      maxReached={gesamtAnzahl >= MAX_BESTELLUNGEN} onPlus={() => setMenge(meal.id, 'gaeste', 1)}      onMinus={() => setMenge(meal.id, 'gaeste', -1)} />
            </View>
          </View>
        );
      })}

      <Modal transparent visible={showConfirm} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Bestellung bestätigen</Text>
            {cartItems.map(m => {
              const w = mengen[m.id]!;
              return (
                <View key={m.id} style={{ marginBottom: 4 }}>
                  {w.studierende > 0 && <Text style={styles.dialogLine}>{w.studierende}× {m.Gerichtname} – Studierende ({isoToShort(m.Ausgabedatum)})</Text>}
                  {w.bedienstete > 0 && <Text style={styles.dialogLine}>{w.bedienstete}× {m.Gerichtname} – Bedienstete ({isoToShort(m.Ausgabedatum)})</Text>}
                  {w.gaeste > 0      && <Text style={styles.dialogLine}>{w.gaeste}× {m.Gerichtname} – Gäste ({isoToShort(m.Ausgabedatum)})</Text>}
                </View>
              );
            })}
            <Text style={styles.dialogGesamt}>Gesamt: {gesamtpreis.toFixed(2).replace('.', ',')} €</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.dialogCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSubmit}>
                <Text style={styles.dialogConfirmText}>Ja, bestellen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ernBadgeColor(typ: string) {
  if (typ === 'vegan')      return { backgroundColor: '#2a7a2a' };
  if (typ === 'vegetarisch') return { backgroundColor: '#5a8a2a' };
  return { backgroundColor: '#888' };
}

function MengeRow({ label, preis, wert, onPlus, onMinus, maxReached = false }: {
  label: string; preis: string; wert: number; onPlus: () => void; onMinus: () => void; maxReached?: boolean;
}) {
  return (
    <View style={styles.mengeRow}>
      <Text style={styles.mengeLabel}>{wert}x {label}</Text>
      <Text style={styles.mengePreis}>{preis}</Text>
      <TouchableOpacity style={styles.mengeBtn} onPress={onMinus}><Text style={styles.mengeBtnText}>−</Text></TouchableOpacity>
      <TouchableOpacity
        style={[styles.mengeBtn, maxReached && styles.mengeBtnDisabled]}
        onPress={onPlus}
        disabled={maxReached}
      >
        <Text style={styles.mengeBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Meine Bestellungen ───────────────────────────────────────────────────────

type PreisInfo = { studierende: string; bedienstete: string; gaeste: string };

function MeineBestellungenContent({ onBookingsChanged }: { onBookingsChanged?: (rows: BestellungRow[]) => void }) {
  const { profile } = useAuthContext();
  const [rows, setRows] = useState<BestellungRow[]>([]);
  const [preiseLookup, setPreiseLookup] = useState<Record<string, PreisInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vergangeneOffen, setVergangeneOffen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editMengen, setEditMengen] = useState<Mengenwahl>({ studierende: 0, bedienstete: 0, gaeste: 0 });
  const [editPreise, setEditPreise] = useState<PreisInfo>({ studierende: '0,00 €', bedienstete: '0,00 €', gaeste: '0,00 €' });
  const [storniereKey, setStorniereKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const email = profile?.['E-Mail'] as string | undefined;

  const ladeBestellungen = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('Bestellungen')
      .select('*')
      .eq('email', email)
      .order('bestell_datum', { ascending: false });

    if (err) {
      setError('Bestellungen konnten nicht geladen werden.');
    } else {
      const bestellungRows = (data ?? []) as BestellungRow[];
      setRows(bestellungRows);
      onBookingsChanged?.(bestellungRows.filter(r => r.bestell_datum >= todayIso()));

      const uniqueDaten = [...new Set(bestellungRows.map(r => r.bestell_datum))];
      if (uniqueDaten.length > 0) {
        const { data: spData } = await supabase
          .from('Speiseplan')
          .select('Ausgabedatum, Gerichtname, PreisStudierende, PreisBedienstet, PreisGast')
          .in('Ausgabedatum', uniqueDaten);
        const lookup: Record<string, PreisInfo> = {};
        for (const sp of (spData ?? [])) {
          lookup[`${sp.Gerichtname}|${sp.Ausgabedatum}`] = {
            studierende: sp.PreisStudierende,
            bedienstete: sp.PreisBedienstet,
            gaeste: sp.PreisGast,
          };
        }
        setPreiseLookup(lookup);
      }
    }
    setLoading(false);
  }, [email]);

  useEffect(() => { ladeBestellungen(); }, [ladeBestellungen]);

  // 13:15-Automatik: nicht abgeholte Bestellungen auf "verfallen" setzen
  useEffect(() => {
    if (rows.length === 0) return;

    const checkDeadline = async () => {
      const today = todayIso();
      const offeneIds = rows
        .filter(r => r.bestell_datum === today && (r.status === 'bestellt' || !r.status))
        .map(r => r.id);

      if (offeneIds.length === 0) return;

      await supabase
        .from('Bestellungen')
        .update({ status: 'verfallen' })
        .in('id', offeneIds);

      // TODO: Supabase Edge Function aufrufen für E-Mail-Versand
      // TODO: freien Bestand im Speiseplan erhöhen

      ladeBestellungen();
    };

    const now = new Date();
    const deadline = new Date();
    deadline.setHours(13, 15, 0, 0);
    const ms = deadline.getTime() - now.getTime();

    if (ms <= 0) {
      checkDeadline();
    } else {
      const timer = setTimeout(checkDeadline, ms);
      return () => clearTimeout(timer);
    }
  }, [rows]);

  const gruppen: BestellungGruppe[] = (() => {
    const map: Record<string, BestellungRow[]> = {};
    for (const r of rows) {
      const key = `${r.gericht_name}|${r.bestell_datum}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    const today = todayIso();
    return Object.entries(map).map(([key, reihen]) => {
      const erste = reihen[0];
      const stud   = reihen.filter(r => r.kategorie === 'Studierende');
      const bed    = reihen.filter(r => r.kategorie === 'Bedienstete');
      const gaeste = reihen.filter(r => r.kategorie === 'Gäste');
      const spPreise = preiseLookup[key];
      const preisS = stud[0]?.preis   ?? spPreise?.studierende ?? '0,00 €';
      const preisB = bed[0]?.preis    ?? spPreise?.bedienstete ?? '0,00 €';
      const preisG = gaeste[0]?.preis ?? spPreise?.gaeste      ?? '0,00 €';
      const gesamt = (
        stud.length   * preisToNumber(preisS) +
        bed.length    * preisToNumber(preisB) +
        gaeste.length * preisToNumber(preisG)
      ).toFixed(2).replace('.', ',') + ' €';
      return {
        key,
        gericht_name: erste.gericht_name,
        bestell_datum: erste.bestell_datum,
        image_url: erste.image_url,
        anzahl_studierende: stud.length,
        preis_studierende: preisS,
        anzahl_bedienstete: bed.length,
        preis_bedienstete: preisB,
        anzahl_gaeste: gaeste.length,
        preis_gaeste: preisG,
        gesamt,
        isPast: erste.bestell_datum < today,
      };
    }).sort((a, b) => a.bestell_datum.localeCompare(b.bestell_datum));
  })();

  const laufende   = gruppen.filter(g => !g.isPast);
  const vergangene = gruppen.filter(g =>  g.isPast).reverse();

  const startEdit = async (g: BestellungGruppe) => {
    setEditKey(g.key);
    setEditMengen({ studierende: g.anzahl_studierende, bedienstete: g.anzahl_bedienstete, gaeste: g.anzahl_gaeste });
    const { data: sp } = await supabase
      .from('Speiseplan')
      .select('PreisStudierende, PreisBedienstet, PreisGast')
      .eq('Ausgabedatum', g.bestell_datum)
      .eq('Gerichtname', g.gericht_name)
      .maybeSingle();
    setEditPreise({
      studierende: sp?.PreisStudierende ?? g.preis_studierende,
      bedienstete: sp?.PreisBedienstet  ?? g.preis_bedienstete,
      gaeste:      sp?.PreisGast        ?? g.preis_gaeste,
    });
  };

  const handleSave = async (g: BestellungGruppe) => {
    if (!email) return;
    setSaving(true);
    const idsToDelete = rows.filter(r => `${r.gericht_name}|${r.bestell_datum}` === g.key).map(r => r.id);
    const { error: delErr } = await supabase.from('Bestellungen').delete().in('id', idsToDelete);
    if (delErr) { Alert.alert('Fehler', 'Bestellung konnte nicht aktualisiert werden.'); setSaving(false); return; }

    const authResult = await supabase.auth.getUser();
    const authUserId = authResult.data?.user?.id ?? null;
    const newRows: Omit<BestellungRow, 'id'>[] = [];
    for (let i = 0; i < editMengen.studierende; i++) newRows.push({ email, gericht_name: g.gericht_name, bestell_datum: g.bestell_datum, kategorie: 'Studierende', preis: editPreise.studierende, image_url: g.image_url, auth_user_id: authUserId as any });
    for (let i = 0; i < editMengen.bedienstete; i++) newRows.push({ email, gericht_name: g.gericht_name, bestell_datum: g.bestell_datum, kategorie: 'Bedienstete', preis: editPreise.bedienstete, image_url: g.image_url, auth_user_id: authUserId as any });
    for (let i = 0; i < editMengen.gaeste;      i++) newRows.push({ email, gericht_name: g.gericht_name, bestell_datum: g.bestell_datum, kategorie: 'Gäste',      preis: editPreise.gaeste,      image_url: g.image_url, auth_user_id: authUserId as any });

    if (newRows.length > 0) {
      const { error: insErr } = await supabase.from('Bestellungen').insert(newRows);
      if (insErr) { Alert.alert('Fehler', 'Bestellung konnte nicht gespeichert werden.'); setSaving(false); return; }
    }
    setEditKey(null);
    setSaving(false);
    ladeBestellungen();
  };

  const handleStornieren = async (g: BestellungGruppe) => {
    if (!email) return;
    setStorniereKey(null);
    const ids = rows.filter(r => `${r.gericht_name}|${r.bestell_datum}` === g.key).map(r => r.id);
    const { error: err } = await supabase.from('Bestellungen').delete().in('id', ids);
    if (err) Alert.alert('Fehler', 'Bestellung konnte nicht storniert werden.');
    else ladeBestellungen();
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Meine Bestellungen</Text>
      {loading && <ActivityIndicator color="#0066cc" style={{ marginTop: 20 }} />}
      {!!error  && <Text style={styles.errorText}>{error}</Text>}

      {!loading && (
        <>
          <Text style={styles.subSectionLabel}>Laufende Bestellungen:</Text>
          {laufende.length === 0 && <Text style={styles.emptyText}>Keine laufenden Bestellungen.</Text>}
          {laufende.map(g => (
            <BestellungKarte
              key={g.key} gruppe={g}
              isEditing={editKey === g.key}
              editMengen={editMengen}
              editPreise={editKey === g.key ? editPreise : undefined}
              saving={saving}
              onEdit={() => startEdit(g)}
              onSave={() => handleSave(g)}
              onAbbrechen={() => setEditKey(null)}
              onStornieren={() => setStorniereKey(g.key)}
              onMengeChange={(kat, delta) => setEditMengen(prev => ({ ...prev, [kat]: Math.max(0, prev[kat] + delta) }))}
            />
          ))}

          {vergangene.length > 0 && (
            <TouchableOpacity style={styles.vergangeneHeader} onPress={() => setVergangeneOffen(v => !v)}>
              <Text style={styles.vergangeneLabel}>Vergangene Bestellungen ({vergangene.length})</Text>
              <Ionicons name={vergangeneOffen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </TouchableOpacity>
          )}
          {vergangeneOffen && vergangene.map(g => (
            <BestellungKarte key={g.key} gruppe={g} isEditing={false} editMengen={editMengen} saving={false} vergangen />
          ))}
        </>
      )}

      <Modal transparent visible={!!storniereKey} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogText}>Möchten Sie diese Bestellung wirklich stornieren?</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setStorniereKey(null)}>
                <Text style={styles.dialogCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={() => { const g = gruppen.find(x => x.key === storniereKey); if (g) handleStornieren(g); }}
              >
                <Text style={styles.dialogConfirmText}>Ja, stornieren</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function BestellungKarte({
  gruppe: g, isEditing, editMengen, editPreise, saving, vergangen = false,
  onEdit, onSave, onAbbrechen, onStornieren, onMengeChange,
}: {
  gruppe: BestellungGruppe;
  isEditing: boolean;
  editMengen: Mengenwahl;
  editPreise?: PreisInfo;
  saving: boolean;
  vergangen?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onAbbrechen?: () => void;
  onStornieren?: () => void;
  onMengeChange?: (kat: keyof Mengenwahl, delta: number) => void;
}) {
  const preisStud = editPreise?.studierende ?? g.preis_studierende;
  const preisBed  = editPreise?.bedienstete ?? g.preis_bedienstete;
  const preisGaes = editPreise?.gaeste      ?? g.preis_gaeste;

  const editGesamt = (
    editMengen.studierende * preisToNumber(preisStud) +
    editMengen.bedienstete * preisToNumber(preisBed)  +
    editMengen.gaeste      * preisToNumber(preisGaes)
  ).toFixed(2).replace('.', ',') + ' €';

  return (
    <View style={[styles.card, vergangen && styles.cardVergangen]}>
      <Text style={[styles.dateLabel, vergangen && styles.dateLabelVergangen]}>{isoToGerman(g.bestell_datum)}</Text>
      {!!g.image_url && <Image source={{ uri: g.image_url }} style={styles.mealImage} resizeMode="cover" />}
      <Text style={[styles.mealName, vergangen && styles.mealNameVergangen]}>{g.gericht_name}</Text>

      {isEditing ? (
        <>
          <MengeRow label="Studierende" preis={preisStud} wert={editMengen.studierende} onPlus={() => onMengeChange?.('studierende', 1)} onMinus={() => onMengeChange?.('studierende', -1)} />
          <MengeRow label="Bedienstete" preis={preisBed}  wert={editMengen.bedienstete} onPlus={() => onMengeChange?.('bedienstete', 1)} onMinus={() => onMengeChange?.('bedienstete', -1)} />
          <MengeRow label="Gäste"       preis={preisGaes} wert={editMengen.gaeste}       onPlus={() => onMengeChange?.('gaeste', 1)}       onMinus={() => onMengeChange?.('gaeste', -1)} />
          <Text style={styles.kartGesamt}>Gesamt: {editGesamt}</Text>
          <TouchableOpacity style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Speichern</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onAbbrechen} disabled={saving}>
            <Text style={styles.secondaryBtnText}>Abbrechen</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {g.anzahl_studierende > 0 && <Text style={styles.karteZeile}>{g.anzahl_studierende}x Studierende</Text>}
          {g.anzahl_bedienstete > 0 && <Text style={styles.karteZeile}>{g.anzahl_bedienstete}x Bedienstete</Text>}
          {g.anzahl_gaeste      > 0 && <Text style={styles.karteZeile}>{g.anzahl_gaeste}x Gäste</Text>}
          <Text style={styles.kartGesamt}>Gesamt: {g.gesamt}</Text>
          {!vergangen && (
            <View style={styles.aktionenRow}>
              <TouchableOpacity style={styles.stornBtn} onPress={onStornieren}><Text style={styles.stornBtnText}>Stornieren</Text></TouchableOpacity>
              <TouchableOpacity style={styles.editBtn}  onPress={onEdit}><Text style={styles.editBtnText}>Bearbeiten</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Bestellabo ───────────────────────────────────────────────────────────────

function AboContent() {
  const { profile } = useAuthContext();
  const email = profile?.['E-Mail'] as string | undefined;

  const [abo, setAbo] = useState<AboSettings>({
    aktiv: false,
    wochentage: [],
    ausgeschlossene_allergene: [],
    vegetarisch: false,
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage]   = useState('');

  // Abo laden
  useEffect(() => {
    if (!email) return;
    supabase
      .from('bestellabos')
      .select('*')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAbo({
            aktiv: data.aktiv ?? false,
            wochentage: data.wochentage ?? [],
            ausgeschlossene_allergene: data.ausgeschlossene_allergene ?? [],
            vegetarisch: data.vegetarisch ?? false,
          });
        }
        setLoading(false);
      });
  }, [email]);

  const toggleWochentag = (dow: number) => {
    setAbo(prev => ({
      ...prev,
      wochentage: prev.wochentage.includes(dow)
        ? prev.wochentage.filter(d => d !== dow)
        : [...prev.wochentage, dow].sort(),
    }));
  };

  const toggleAllergen = (a: string) => {
    setAbo(prev => ({
      ...prev,
      ausgeschlossene_allergene: prev.ausgeschlossene_allergene.includes(a)
        ? prev.ausgeschlossene_allergene.filter(x => x !== a)
        : [...prev.ausgeschlossene_allergene, a],
    }));
  };

  const speichern = async () => {
    if (!email) return;
    setSaving(true);
    setMessage('');
    const authResult = await supabase.auth.getUser();
    const authUserId = authResult.data?.user?.id ?? null;

    const payload = {
      email,
      auth_user_id: authUserId,
      aktiv: abo.aktiv,
      wochentage: abo.wochentage,
      ausgeschlossene_allergene: abo.ausgeschlossene_allergene,
      vegetarisch: abo.vegetarisch,
    };

    const { error } = await supabase
      .from('bestellabos')
      .upsert(payload, { onConflict: 'email' });

    setSaving(false);
    setMessage(error ? `Fehler: ${error.message}` : 'Abo-Einstellungen gespeichert.');
  };

  // Abo jetzt anwenden: automatisch für die Zitwoche bestellen
  const aboAnwenden = async () => {
    if (!email || !abo.aktiv || abo.wochentage.length === 0) return;
    setApplying(true);
    setMessage('');

    const wochentage = getUebernachsteWoche(); // ['2026-06-22', ...]
    const { data: speiseplan } = await supabase
      .from('Speiseplan')
      .select('*')
      .in('Ausgabedatum', wochentage);

    const authResult = await supabase.auth.getUser();
    const authUserId = authResult.data?.user?.id ?? null;

    const rows: Omit<BestellungRow, 'id'>[] = [];
    for (const meal of (speiseplan ?? []) as SpeiseplanEintrag[]) {
      const dow = isoToDate(meal.Ausgabedatum).getDay(); // 1=Mo...5=Fr
      if (!abo.wochentage.includes(dow)) continue;
      if (!matchesAbo(abo, meal)) continue;

      // Prüfen ob bereits bestellt
      const { data: existing } = await supabase
        .from('Bestellungen')
        .select('id')
        .eq('email', email)
        .eq('bestell_datum', meal.Ausgabedatum)
        .limit(1);

      if (existing && existing.length > 0) continue;

      rows.push({
        email,
        gericht_name: meal.Gerichtname,
        bestell_datum: meal.Ausgabedatum,
        kategorie: 'Studierende',
        preis: meal.PreisStudierende,
        image_url: meal.image_url,
        auth_user_id: authUserId as any,
        status: 'bestellt',
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('Bestellungen').insert(rows);
      setMessage(error ? `Fehler: ${error.message}` : `${rows.length} Bestellung(en) automatisch aufgegeben.`);
    } else {
      setMessage('Keine neuen Bestellungen (bereits bestellt oder kein passendes Gericht).');
    }
    setApplying(false);
  };

  if (loading) return <ActivityIndicator color="#0066cc" style={{ marginTop: 30 }} />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Bestellabo</Text>

      {/* Hinweistext */}
      <View style={styles.aboHinweis}>
        <Ionicons name="warning-outline" size={18} color="#a05000" style={{ marginTop: 1 }} />
        <Text style={styles.aboHinweisText}>
          Bitte stornieren Sie Ihr Abo manuell, wenn Sie an einem Tag nicht kommen (z. B. Vorlesungsausfall).
        </Text>
      </View>

      {/* Abo aktiv */}
      <View style={styles.aboRow}>
        <Text style={styles.aboLabel}>Abo aktiv</Text>
        <Switch
          value={abo.aktiv}
          onValueChange={v => setAbo(prev => ({ ...prev, aktiv: v }))}
          trackColor={{ true: '#18345d' }}
        />
      </View>

      {/* Wochentage */}
      <Text style={styles.aboSectionLabel}>Wochentage</Text>
      <View style={styles.wochentageRow}>
        {[1, 2, 3, 4, 5].map(dow => (
          <TouchableOpacity
            key={dow}
            style={[styles.tagChip, abo.wochentage.includes(dow) && styles.tagChipActive]}
            onPress={() => toggleWochentag(dow)}
          >
            <Text style={[styles.tagChipText, abo.wochentage.includes(dow) && styles.tagChipTextActive]}>
              {WEEKDAY_SHORT[dow]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Allergene ausschließen */}
      <Text style={styles.aboSectionLabel}>Allergene ausschließen</Text>
      <View style={styles.allergenGrid}>
        {ALLE_ALLERGENE.map(a => {
          const aktiv = abo.ausgeschlossene_allergene.includes(a);
          return (
            <TouchableOpacity
              key={a}
              style={[styles.allergenChip, aktiv && styles.allergenChipActive]}
              onPress={() => toggleAllergen(a)}
            >
              <Text style={[styles.allergenChipText, aktiv && styles.allergenChipTextActive]}>{a}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Vegetarisch */}
      <View style={styles.aboRow}>
        <Text style={styles.aboLabel}>Nur vegetarisch / vegan</Text>
        <Switch
          value={abo.vegetarisch}
          onValueChange={v => setAbo(prev => ({ ...prev, vegetarisch: v }))}
          trackColor={{ true: '#18345d' }}
        />
      </View>

      {/* Aktionen */}
      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.btnDisabled]}
        onPress={speichern}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Einstellungen speichern</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { marginTop: 8 }, (!abo.aktiv || applying) && styles.btnDisabled]}
        onPress={aboAnwenden}
        disabled={!abo.aktiv || applying}
      >
        {applying
          ? <ActivityIndicator color="#18345d" />
          : <Text style={styles.secondaryBtnText}>Abo jetzt anwenden (übernächste Woche)</Text>}
      </TouchableOpacity>

      {!!message && (
        <Text style={[styles.infoText, { marginTop: 12 }]}>{message}</Text>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 14, paddingBottom: 140 },

  navBar: { flexDirection: 'row' },
  navBtn: {
    flex: 1,
    backgroundColor: '#2277bb',
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a5f99',
  },
  navBtnActive: { backgroundColor: '#18345d' },
  navLabel: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  sectionTitle:    { fontSize: 18, fontWeight: '700', color: '#18345d', marginBottom: 6 },
  infoText:        { fontSize: 13, color: '#555', marginBottom: 14 },
  subSectionLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 4 },
  emptyText:       { fontSize: 13, color: '#888', marginTop: 8 },
  errorText:       { fontSize: 13, color: '#cc0000', marginTop: 8 },

  card: {
    borderRadius: 8, borderWidth: 1.5, borderColor: '#99bbdd',
    padding: 12, marginBottom: 12, backgroundColor: '#fff',
  },
  cardVergangen: { borderColor: '#cccccc', backgroundColor: '#f7f7f7' },

  dateLabel:         { fontSize: 13, fontWeight: '700', color: '#0055cc', marginBottom: 8 },
  dateLabelVergangen:{ color: '#888888' },
  mealImage:         { width: '100%', height: 150, borderRadius: 6, marginBottom: 8 },
  mealName:          { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  mealNameVergangen: { color: '#777' },
  allergenText:      { fontSize: 12, color: '#888', marginBottom: 6 },

  ernaehrungBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  ernaehrungText:  { fontSize: 11, fontWeight: '700', color: '#fff' },

  mengenBlock: { marginTop: 8, gap: 6 },
  mengeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mengeLabel:  { flex: 1, fontSize: 13, color: '#333' },
  mengePreis:  { fontSize: 13, color: '#555', marginRight: 4 },
  mengeBtn:        { width: 32, height: 32, borderRadius: 6, backgroundColor: '#6655cc', justifyContent: 'center', alignItems: 'center' },
  mengeBtnDisabled:{ backgroundColor: '#cccccc' },
  mengeBtnText:    { fontSize: 18, color: '#fff', fontWeight: '700', lineHeight: 22 },

  zaehlerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eef4ff', borderRadius: 8, borderWidth: 1.5,
    borderColor: '#99bbdd', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  zaehlerBarVoll: { backgroundColor: '#fff0e0', borderColor: '#e08030' },
  zaehlerText:    { fontSize: 13, fontWeight: '700', color: '#18345d' },
  zaehlerLimit:   { fontSize: 12, fontWeight: '700', color: '#e05800' },

  cartBox: {
    backgroundColor: '#f0f4ff', borderRadius: 8,
    borderWidth: 1.5, borderColor: '#99bbdd', padding: 14, marginBottom: 12,
  },
  cartTitle:   { fontSize: 14, fontWeight: '700', color: '#18345d', marginBottom: 8 },
  cartLine:    { fontSize: 13, color: '#333', marginBottom: 2 },
  cartGesamt:  { fontSize: 14, fontWeight: '700', color: '#18345d', marginTop: 8, marginBottom: 12 },

  primaryBtn:     { backgroundColor: '#18345d', borderRadius: 6, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn:   { borderWidth: 1.5, borderColor: '#18345d', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText:{ color: '#18345d', fontSize: 14, fontWeight: '600' },
  btnDisabled:    { opacity: 0.5 },

  successBox:   { backgroundColor: '#e8f8e8', borderRadius: 8, borderWidth: 1.5, borderColor: '#66bb66', padding: 20, gap: 12 },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#226622' },
  successText:  { fontSize: 13, color: '#336633', lineHeight: 20 },

  kartGesamt:  { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 6, marginBottom: 8 },
  karteZeile:  { fontSize: 13, color: '#444', marginBottom: 2 },
  aktionenRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stornBtn:    { flex: 1, backgroundColor: '#6655cc', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  stornBtnText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  editBtn:     { flex: 1, backgroundColor: '#6655cc', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  vergangeneHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#dddddd', marginTop: 8,
  },
  vergangeneLabel: { fontSize: 14, fontWeight: '700', color: '#555' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: {
    backgroundColor: '#fff', borderRadius: 10, padding: 24, marginHorizontal: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  dialogTitle:      { fontSize: 15, fontWeight: '700', color: '#18345d', marginBottom: 10 },
  dialogLine:       { fontSize: 13, color: '#444', marginBottom: 2 },
  dialogGesamt:     { fontSize: 14, fontWeight: '700', color: '#18345d', marginTop: 8, marginBottom: 16 },
  dialogText:       { fontSize: 15, color: '#222', textAlign: 'center', marginBottom: 20 },
  dialogButtons:    { flexDirection: 'row', gap: 12 },
  dialogCancelBtn:  { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1.5, borderColor: '#aaa', alignItems: 'center' },
  dialogCancelText: { fontSize: 14, color: '#555' },
  dialogConfirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, backgroundColor: '#18a050', alignItems: 'center' },
  dialogConfirmText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

  // Abo-spezifisch
  aboHinweis: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fff7e6',
    borderRadius: 8, borderWidth: 1.5, borderColor: '#e0a040',
    padding: 12, marginBottom: 16,
  },
  aboHinweisText: { flex: 1, fontSize: 13, color: '#7a3f00', lineHeight: 18 },
  aboRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  aboLabel:       { fontSize: 14, fontWeight: '600', color: '#222' },
  aboSectionLabel:{ fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },

  wochentageRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tagChip: {
    flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, borderColor: '#aaa',
    alignItems: 'center',
  },
  tagChipActive:     { backgroundColor: '#18345d', borderColor: '#18345d' },
  tagChipText:       { fontSize: 13, fontWeight: '600', color: '#555' },
  tagChipTextActive: { color: '#fff' },

  allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  allergenChip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#aaa', backgroundColor: '#fff',
  },
  allergenChipActive:    { backgroundColor: '#cc3333', borderColor: '#cc3333' },
  allergenChipText:      { fontSize: 13, color: '#333' },
  allergenChipTextActive:{ color: '#fff', fontWeight: '700' },
});
