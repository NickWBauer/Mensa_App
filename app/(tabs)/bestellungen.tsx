import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
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

function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

function getIsoWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function isInCurrentOrNextCalendarWeek(iso: string): boolean {
  const target = isoToDate(iso);
  target.setHours(0, 0, 0, 0);
  const currentMonday = getIsoWeekMonday(new Date());
  const nextWeekMonday = new Date(currentMonday);
  nextWeekMonday.setDate(currentMonday.getDate() + 7);
  const nextWeekSunday = new Date(nextWeekMonday);
  nextWeekSunday.setDate(nextWeekMonday.getDate() + 6);
  nextWeekSunday.setHours(23, 59, 59, 999);
  return target >= currentMonday && target <= nextWeekSunday;
}

async function sendOrderConfirmationEmail(
  user: { email?: string | null; user_metadata?: any },
  orderRows: Omit<BestellungRow, 'id'>[]
) {
  if (!user?.email) {
    throw new Error('Keine gültige Empfänger-E-Mail gefunden.');
  }

  const orderSummary = orderRows
    .map(row => `1x ${row.gericht_name} | ${isoToShort(row.bestell_datum)} | ${row.kategorie} | ${row.preis}`)
    .join('\n');

  const totalPrice = orderRows.reduce((sum, row) => sum + preisToNumber(row.preis), 0);

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Keine aktive Session – bitte erneut einloggen.');
  }

  const response = await fetch(
    `${supabase.supabaseUrl}/functions/v1/send-order-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabase.supabaseKey,
      },
      body: JSON.stringify({
        to_email: user.email,
        name: user.user_metadata?.full_name || user.email,
        gericht: orderSummary,
        preis: formatPrice(totalPrice),
        datum: orderRows[0]?.bestell_datum ? isoToShort(orderRows[0].bestell_datum) : '-',
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bestätigungsmail konnte nicht gesendet werden: ${text}`);
  }
}


/** Matching-Logik: Gibt true zurück wenn das Gericht die Abo-Kriterien erfüllt */
function matchesAbo(abo: AboSettings, meal: SpeiseplanEintrag): boolean {
  if (abo.ausgeschlossene_allergene.length > 0 && meal.Allergene) {
    const mealAllergene = meal.Allergene.split(',').map(a => a.trim().toLowerCase());
    for (const a of abo.ausgeschlossene_allergene) {
      if (mealAllergene.includes(a.toLowerCase())) return false;
    }
  }
  if (abo.vegan        && meal.ernaehrungstyp !== 'vegan') return false;
  if (abo.vegetarisch  && meal.ernaehrungstyp === 'nicht vegetarisch') return false;
  return true;
}

async function tryRestoreSession() {
  try {
    const [at, rt] = await Promise.all([
      getItemAsync('mensa_access_token'),
      getItemAsync('mensa_refresh_token'),
    ]);
    if (at && rt) await supabase.auth.setSession({ access_token: at, refresh_token: rt });
  } catch {}
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
  status?: 'bestellt' | 'abgeholt' | 'nicht abgeholt' | 'storniert';
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
  status?: 'bestellt' | 'abgeholt' | 'nicht abgeholt' | 'storniert';
};

type AboSettings = {
  aktiv: boolean;
  // 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr
  wochentage: number[];
  ausgeschlossene_allergene: string[];
  vegetarisch: boolean;
  vegan: boolean;
  nutzertyp: 'Studierende' | 'Bedienstete' | 'Externe';
};

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export default function Bestellungen() {
  const { bookingStatus, activeAbo } = useAuthContext();
  const [openSection, setOpenSection] = useState<SubTab | null>(null);
  const toggleSection = (tab: SubTab) => setOpenSection(prev => prev === tab ? null : tab);

  return (
    <View style={styles.container}>
      <LogoHeader showDateTime bookingStatus={bookingStatus} activeAbo={activeAbo} />
      <ScrollView style={{ flex: 1 }}>
        <SectionHeader title="Vorbestellung"     open={openSection === 'vorbestellung'} onPress={() => toggleSection('vorbestellung')} />
        {openSection === 'vorbestellung' && <VorbestellungContent />}

        <SectionHeader title="Meine Bestellungen" open={openSection === 'meine'} onPress={() => toggleSection('meine')} />
        {openSection === 'meine' && <MeineBestellungenContent />}

        <SectionHeader title="Bestellabo"        open={openSection === 'abo'}  onPress={() => toggleSection('abo')} />
        {/* AboContent stays mounted — display:none preserves state across accordion toggles */}
        <View style={openSection !== 'abo' ? { display: 'none' } : undefined}>
          <AboContent />
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, open, onPress }: { title: string; open: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.sectionHeader, open && styles.sectionHeaderOpen]} onPress={onPress}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#ffffff" />
    </TouchableOpacity>
  );
}

// ─── Vorbestellung ────────────────────────────────────────────────────────────

function VorbestellungContent() {
  const { profile, refreshBookingStatus, activeAbo } = useAuthContext();
  const [authEmail, setAuthEmail] = useState<string | undefined>(undefined);
  const email = (profile?.email ?? authEmail) as string | undefined;

  const [speiseplan, setSpeiseplan] = useState<SpeiseplanEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mengen, setMengen] = useState<Record<number, Mengenwahl>>({});
  // Bestehende aktive Bestellungen pro Datum (aus DB), für Tages-Limit
  const [bestandPerDatum, setBestandPerDatum] = useState<Record<string, number>>({});
  // Bestehende aktive Bestellungen pro Gericht+Datum (für "Bereits bestellt"-Badge)
  const [bestandPerMeal, setBestandPerMeal] = useState<Record<string, Mengenwahl>>({});

  const wochentage = useMemo(() => getUebernachsteWoche(), []);

  // Pre-fill mengen with abo-ordered quantities so the stepper reflects existing orders
  useEffect(() => {
    if (speiseplan.length === 0 || Object.keys(bestandPerMeal).length === 0) return;
    setMengen(prev => {
      const next = { ...prev };
      for (const meal of speiseplan) {
        const bm = bestandPerMeal[`${meal.Gerichtname}|${meal.Ausgabedatum}`];
        if (!bm || (bm.studierende === 0 && bm.bedienstete === 0 && bm.gaeste === 0)) continue;
        const cur = next[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        next[meal.id] = {
          studierende: Math.max(cur.studierende, bm.studierende),
          bedienstete: Math.max(cur.bedienstete, bm.bedienstete),
          gaeste:      Math.max(cur.gaeste,      bm.gaeste),
        };
      }
      return next;
    });
  }, [bestandPerMeal, speiseplan]);

  // Session-Anzahl = only NEW additions above the abo-prefill (avoids double-counting with bestandPerDatum)
  const sessionCountPerDatum = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const meal of speiseplan) {
      const w  = mengen[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
      const bm = bestandPerMeal[`${meal.Gerichtname}|${meal.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
      const n  = Math.max(0, w.studierende - bm.studierende)
               + Math.max(0, w.bedienstete - bm.bedienstete)
               + Math.max(0, w.gaeste      - bm.gaeste);
      if (n > 0) counts[meal.Ausgabedatum] = (counts[meal.Ausgabedatum] ?? 0) + n;
    }
    return counts;
  }, [mengen, speiseplan, bestandPerMeal]);


  useEffect(() => {
    const loadAuthEmail = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthEmail(data?.user?.email ?? undefined);
    }
    loadAuthEmail();
  }, []);

  // Speiseplan laden
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

  // Bestehende Bestellungen für die Zielwoche laden (Tages-Limit + Meal-Badge)
  useEffect(() => {
    if (!email || wochentage.length === 0) return;
    supabase
      .from('Bestellungen')
      .select('gericht_name, bestell_datum, kategorie, status')
      .eq('email', email)
      .in('bestell_datum', wochentage)
      .then(({ data }) => {
        const datumCounts: Record<string, number> = {};
        const mealLookup: Record<string, Mengenwahl> = {};
        for (const row of (data ?? []) as { gericht_name: string; bestell_datum: string; kategorie: string; status?: string }[]) {
          if (row.status === 'storniert' || row.status === 'nicht abgeholt') continue;
          datumCounts[row.bestell_datum] = (datumCounts[row.bestell_datum] ?? 0) + 1;
          const key = `${row.gericht_name}|${row.bestell_datum}`;
          if (!mealLookup[key]) mealLookup[key] = { studierende: 0, bedienstete: 0, gaeste: 0 };
          if (row.kategorie === 'Studierende') mealLookup[key].studierende++;
          else if (row.kategorie === 'Bedienstete') mealLookup[key].bedienstete++;
          else if (row.kategorie === 'Gäste') mealLookup[key].gaeste++;
        }
        setBestandPerDatum(datumCounts);
        setBestandPerMeal(mealLookup);
      });
  }, [email]);

  const setMenge = (mealId: number, kat: keyof Mengenwahl, delta: number) => {
    if (delta > 0) {
      const meal = speiseplan.find(m => m.id === mealId);
      if (meal) {
        const datum = meal.Ausgabedatum;
        const existing = bestandPerDatum[datum] ?? 0;
        const session  = sessionCountPerDatum[datum] ?? 0;
        if (existing + session >= MAX_BESTELLUNGEN) return;
      }
    }
    const curr = mengen[mealId] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
    const newVal = Math.max(0, curr[kat] + delta);
    setMengen(prev => ({ ...prev, [mealId]: { ...(prev[mealId] ?? { studierende: 0, bedienstete: 0, gaeste: 0 }), [kat]: newVal } }));

    // If the user reduced INTO the abo-booked quantity, immediately remove that DB row
    if (delta < 0 && email) {
      const meal = speiseplan.find(m => m.id === mealId);
      if (meal) {
        const mealKey = `${meal.Gerichtname}|${meal.Ausgabedatum}`;
        const bm = bestandPerMeal[mealKey] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        if (curr[kat] > 0 && curr[kat] <= bm[kat]) {
          // Optimistically update local display right away
          setBestandPerMeal(prev => {
            const pb = prev[mealKey] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
            return { ...prev, [mealKey]: { ...pb, [kat]: Math.max(0, pb[kat] - 1) } };
          });
          setBestandPerDatum(prev => ({ ...prev, [meal.Ausgabedatum]: Math.max(0, (prev[meal.Ausgabedatum] ?? 0) - 1) }));
          // Background DELETE of the abo row
          const katLabel: Record<keyof Mengenwahl, string> = { studierende: 'Studierende', bedienstete: 'Bedienstete', gaeste: 'Gäste' };
          const gericht = meal.Gerichtname;
          const datum   = meal.Ausgabedatum;
          const katStr  = katLabel[kat];
          const forEmail = email;
          ;(async () => {
            await tryRestoreSession();
            const { data } = await supabase
              .from('Bestellungen').select('id')
              .eq('email', forEmail).eq('gericht_name', gericht).eq('bestell_datum', datum)
              .eq('kategorie', katStr).neq('status', 'nicht abgeholt').neq('status', 'storniert').limit(1);
            if (data && data.length > 0) {
              await supabase.from('Bestellungen').delete().in('id', (data as { id: number }[]).map(r => r.id));
            }
          })();
        }
      }
    }
  };

  // cartItems: meals where the user added MORE than the abo already booked
  const cartItems = speiseplan.filter(m => {
    const w  = mengen[m.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
    const bm = bestandPerMeal[`${m.Gerichtname}|${m.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
    return Math.max(0, w.studierende - bm.studierende)
         + Math.max(0, w.bedienstete - bm.bedienstete)
         + Math.max(0, w.gaeste      - bm.gaeste) > 0;
  });

  const gesamtpreis = cartItems.reduce((sum, m) => {
    const w  = mengen[m.id]!;
    const bm = bestandPerMeal[`${m.Gerichtname}|${m.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
    return sum
      + Math.max(0, w.studierende - bm.studierende) * preisToNumber(m.PreisStudierende)
      + Math.max(0, w.bedienstete - bm.bedienstete) * preisToNumber(m.PreisBedienstet)
      + Math.max(0, w.gaeste      - bm.gaeste)      * preisToNumber(m.PreisGast);
  }, 0);

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (sessionError || !user) {
        setError('Kein eingeloggter Nutzer gefunden.');
        return;
      }

      let emailToUse = email ?? user.email ?? undefined;
      if (!emailToUse) {
        setError('Keine E-Mail-Adresse gefunden.');
        return;
      }

      const authUserId = user.id ?? null;

      // Verfallen rows where user reduced below the abo-ordered quantity
      const mealsWithReduction = speiseplan.filter(meal => {
        const w  = mengen[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        const bm = bestandPerMeal[`${meal.Gerichtname}|${meal.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        return w.studierende < bm.studierende || w.bedienstete < bm.bedienstete || w.gaeste < bm.gaeste;
      });
      for (const meal of mealsWithReduction) {
        const w  = mengen[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        const bm = bestandPerMeal[`${meal.Gerichtname}|${meal.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        const { data: existingRows } = await supabase
          .from('Bestellungen').select('id, kategorie')
          .eq('email', emailToUse).eq('gericht_name', meal.Gerichtname).eq('bestell_datum', meal.Ausgabedatum)
          .neq('status', 'nicht abgeholt').neq('status', 'storniert');
        const r = (existingRows ?? []) as { id: number; kategorie: string }[];
        const toVerfallen = [
          ...r.filter(x => x.kategorie === 'Studierende').slice(0, Math.max(0, bm.studierende - w.studierende)),
          ...r.filter(x => x.kategorie === 'Bedienstete').slice(0, Math.max(0, bm.bedienstete - w.bedienstete)),
          ...r.filter(x => x.kategorie === 'Gäste').slice(0,      Math.max(0, bm.gaeste      - w.gaeste)),
        ].map(x => x.id);
        if (toVerfallen.length > 0) {
          await supabase.from('Bestellungen').update({ status: 'nicht abgeholt' }).in('id', toVerfallen);
        }
      }

      // Only insert delta rows (new additions beyond what abo already ordered)
      const rows: Omit<BestellungRow, 'id'>[] = [];
      for (const meal of cartItems) {
        const w  = mengen[meal.id] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        const bm = bestandPerMeal[`${meal.Gerichtname}|${meal.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
        const dS = Math.max(0, w.studierende - bm.studierende);
        const dB = Math.max(0, w.bedienstete - bm.bedienstete);
        const dG = Math.max(0, w.gaeste      - bm.gaeste);
        for (let i = 0; i < dS; i++)
          rows.push({ email: emailToUse, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum, kategorie: 'Studierende', preis: meal.PreisStudierende, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt' });
        for (let i = 0; i < dB; i++)
          rows.push({ email: emailToUse, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum, kategorie: 'Bedienstete', preis: meal.PreisBedienstet, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt' });
        for (let i = 0; i < dG; i++)
          rows.push({ email: emailToUse, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum, kategorie: 'Gäste', preis: meal.PreisGast, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt' });
      }
      if (rows.length === 0 && mealsWithReduction.length === 0) return;

      // Server-seitige Tages-Limit-Prüfung (pro Datum neu aus DB lesen)
      const newByDate: Record<string, number> = {};
      for (const row of rows) {
        newByDate[row.bestell_datum] = (newByDate[row.bestell_datum] ?? 0) + 1;
      }
      for (const [datum, newCount] of Object.entries(newByDate)) {
        const { data: existingRows } = await supabase
          .from('Bestellungen')
          .select('id, status')
          .eq('email', emailToUse)
          .eq('bestell_datum', datum);
        const existingCount = (existingRows ?? []).filter(
          (r: any) => r.status !== 'storniert' && r.status !== 'nicht abgeholt',
        ).length;
        if (existingCount + newCount > MAX_BESTELLUNGEN) {
          const remaining = MAX_BESTELLUNGEN - existingCount;
          setError(
            `${isoToGerman(datum)}: bereits ${existingCount}/${MAX_BESTELLUNGEN} Essen bestellt.` +
            (remaining > 0 ? ` Noch ${remaining} ${remaining === 1 ? 'Essen' : 'Essen'} möglich.` : ' Tages-Limit erreicht.')
          );
          return;
        }
      }

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('Bestellungen').insert(rows);
        if (insertError) {
          setError(`Bestellung konnte nicht gespeichert werden. (${insertError.message})`);
          return;
        }

        try {
          await sendOrderConfirmationEmail(user, rows);
        } catch (mailError: any) {
          setError(`Bestellung gespeichert, aber Bestätigungsmail konnte nicht gesendet werden. ${mailError?.message ?? ''}`);
          setMengen({});
          setSuccess(true);
          refreshBookingStatus();
          return;
        }
      }

      setMengen({});
      setSuccess(true);
      refreshBookingStatus();
    } catch (e: any) {
      setError(`Fehler: ${e?.message ?? 'Unbekannter Fehler'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const wocheStart = wochentage[0];
  const wocheEnde  = wochentage[4];
  const wocheLabel = `${isoToDate(wocheStart).getDate()}.${pad(isoToDate(wocheStart).getMonth() + 1)} – ${isoToDate(wocheEnde).getDate()}.${pad(isoToDate(wocheEnde).getMonth() + 1)}.${isoToDate(wocheEnde).getFullYear()}`;

  // Tage mit aktiver Bestellaktivität (für Zähleranzeige)
  const aktiveDaten = wochentage.filter(
    d => (bestandPerDatum[d] ?? 0) + (sessionCountPerDatum[d] ?? 0) > 0,
  );

  return (
    <View style={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Vorbestellung</Text>
      <Text style={styles.infoText}>Zeitraum: {wocheLabel}</Text>

      {/* Kompakte Erfolgs-Badge – bleibt sichtbar, stört nicht */}
      {success && (
        <View style={styles.successBadge}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#226622" />
          <Text style={styles.successBadgeText}>Bestellung aufgegeben – einsehbar unter „Meine Bestellungen".</Text>
        </View>
      )}

      {/* Tages-Limit-Hinweis */}
      {!loading && (
        <View style={styles.tagesLimitBox}>
          <View style={styles.tagesLimitHeader}>
            <Ionicons name="information-circle-outline" size={14} color="#18345d" style={{ marginTop: 1 }} />
            <Text style={styles.tagesLimitHinweis}>Maximal 3 Essen pro Tag bestellbar</Text>
          </View>
          {aktiveDaten.map(d => {
            const total = (bestandPerDatum[d] ?? 0) + (sessionCountPerDatum[d] ?? 0);
            const voll  = total >= MAX_BESTELLUNGEN;
            return (
              <View key={d} style={[styles.datumZeile, voll && styles.datumZeileVoll]}>
                <Text style={[styles.datumZeileText, voll && styles.datumZeileTextVoll]}>
                  {isoToShort(d)}: {total}/{MAX_BESTELLUNGEN} Essen bestellt
                </Text>
                {voll && <Text style={styles.datumVollHinweis}>Limit erreicht</Text>}
              </View>
            );
          })}
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
        const datumVoll = (bestandPerDatum[meal.Ausgabedatum] ?? 0) + (sessionCountPerDatum[meal.Ausgabedatum] ?? 0) >= MAX_BESTELLUNGEN;
        const bm = bestandPerMeal[`${meal.Gerichtname}|${meal.Ausgabedatum}`];
        const mealDow = isoToDate(meal.Ausgabedatum).getDay();
        const isAboDay = !!(activeAbo?.aktiv && activeAbo.wochentage.includes(mealDow));
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
            {!!bm && (bm.studierende > 0 || bm.bedienstete > 0 || bm.gaeste > 0) && (
              <View style={styles.bestandBlock}>
                {bm.studierende > 0 && (
                  <View style={styles.bestandZeile}>
                    <Ionicons name="checkmark-circle-outline" size={12} color="#226622" />
                    <Text style={styles.bestandZeileText}>{bm.studierende}× Studierende</Text>
                    {isAboDay && <Text style={styles.aboTag}>(Abo)</Text>}
                  </View>
                )}
                {bm.bedienstete > 0 && (
                  <View style={styles.bestandZeile}>
                    <Ionicons name="checkmark-circle-outline" size={12} color="#226622" />
                    <Text style={styles.bestandZeileText}>{bm.bedienstete}× Bedienstete</Text>
                    {isAboDay && <Text style={styles.aboTag}>(Abo)</Text>}
                  </View>
                )}
                {bm.gaeste > 0 && (
                  <View style={styles.bestandZeile}>
                    <Ionicons name="checkmark-circle-outline" size={12} color="#226622" />
                    <Text style={styles.bestandZeileText}>{bm.gaeste}× Gäste</Text>
                    {isAboDay && <Text style={styles.aboTag}>(Abo)</Text>}
                  </View>
                )}
              </View>
            )}
            <View style={styles.mengenBlock}>
              <MengeRow label="Studierende" preis={meal.PreisStudierende} wert={w.studierende} maxReached={datumVoll} onPlus={() => setMenge(meal.id, 'studierende', 1)} onMinus={() => setMenge(meal.id, 'studierende', -1)} />
              <MengeRow label="Bedienstete" preis={meal.PreisBedienstet}  wert={w.bedienstete} maxReached={datumVoll} onPlus={() => setMenge(meal.id, 'bedienstete', 1)} onMinus={() => setMenge(meal.id, 'bedienstete', -1)} />
              <MengeRow label="Gäste"       preis={meal.PreisGast}        wert={w.gaeste}      maxReached={datumVoll} onPlus={() => setMenge(meal.id, 'gaeste', 1)}      onMinus={() => setMenge(meal.id, 'gaeste', -1)} />
            </View>
          </View>
        );
      })}

      <Modal transparent visible={showConfirm} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Bestellung bestätigen</Text>
            {cartItems.map(m => {
              const w  = mengen[m.id]!;
              const bm = bestandPerMeal[`${m.Gerichtname}|${m.Ausgabedatum}`] ?? { studierende: 0, bedienstete: 0, gaeste: 0 };
              const dS = Math.max(0, w.studierende - bm.studierende);
              const dB = Math.max(0, w.bedienstete - bm.bedienstete);
              const dG = Math.max(0, w.gaeste      - bm.gaeste);
              return (
                <View key={m.id} style={{ marginBottom: 4 }}>
                  {dS > 0 && <Text style={styles.dialogLine}>{dS}× {m.Gerichtname} – Studierende ({isoToShort(m.Ausgabedatum)})</Text>}
                  {dB > 0 && <Text style={styles.dialogLine}>{dB}× {m.Gerichtname} – Bedienstete ({isoToShort(m.Ausgabedatum)})</Text>}
                  {dG > 0 && <Text style={styles.dialogLine}>{dG}× {m.Gerichtname} – Gäste ({isoToShort(m.Ausgabedatum)})</Text>}
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
    </View>
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

function MeineBestellungenContent() {
  const { profile, refreshBookingStatus } = useAuthContext();
  const [authEmail, setAuthEmail] = useState<string | undefined>(undefined);
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
  const [refreshing, setRefreshing] = useState(false);

  const email = (profile?.email ?? authEmail) as string | undefined;

  useEffect(() => {
    const loadAuthEmail = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthEmail(data?.user?.email ?? undefined);
    }
    loadAuthEmail();
  }, []);

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

  // 13:15-Automatik: nicht abgeholte Bestellungen auf "nicht abgeholt" setzen
  useEffect(() => {
    if (rows.length === 0) return;

    const checkDeadline = async () => {
      const today = todayIso();
      const offeneIds = rows
        .filter(r => r.bestell_datum === today && (r.status === 'bestellt' || !r.status))
        .map(r => r.id);

      if (offeneIds.length === 0) return;

      // Mark unpicked orders as 'nicht abgeholt' but keep them in the Bestellungen table
      await supabase
        .from('Bestellungen')
        .update({ status: 'nicht abgeholt' })
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
      if (r.status === 'storniert' || r.status === 'nicht abgeholt') continue;
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
        status: erste.status,
      };
    }).filter(g => g.bestell_datum >= today).sort((a, b) => a.bestell_datum.localeCompare(b.bestell_datum));
  })();

  const laufende   = gruppen.filter(g => !g.isPast);
  const vergangene = gruppen.filter(g =>  g.isPast).reverse();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await ladeBestellungen();
    setRefreshing(false);
  }, [ladeBestellungen]);

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

    const activeDateRows = rows.filter(r => r.bestell_datum === g.bestell_datum && r.status !== 'storniert' && r.status !== 'nicht abgeholt');
    const currentGroupRows = activeDateRows.filter(r => `${r.gericht_name}|${r.bestell_datum}` === g.key);
    const otherCount = activeDateRows.length - currentGroupRows.length;
    const newCount = editMengen.studierende + editMengen.bedienstete + editMengen.gaeste;
    const isLockedForIncrease = isInCurrentOrNextCalendarWeek(g.bestell_datum);

    if (newCount > currentGroupRows.length && isLockedForIncrease) {
      Alert.alert(
        'Erhöhung nicht möglich',
        'Bestellungen für diese und die kommende Kalenderwoche können nicht mehr erhöht werden.'
      );
      setSaving(false);
      return;
    }

    if (otherCount + newCount > MAX_BESTELLUNGEN) {
      Alert.alert(
        'Begrenzung überschritten',
        `Für ${isoToGerman(g.bestell_datum)} sind maximal ${MAX_BESTELLUNGEN} Essen pro Tag erlaubt. Bitte reduziere die Anzahl.`
      );
      setSaving(false);
      return;
    }

    // Nur aktive Zeilen löschen — stornierte bleiben als Abo-Schutz erhalten
    const idsToDelete = currentGroupRows.map(r => r.id);
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
    refreshBookingStatus();
  };

  const handleStornieren = async (g: BestellungGruppe) => {
    if (!email) return;
    setStorniereKey(null);
    const ids = rows
      .filter(r => `${r.gericht_name}|${r.bestell_datum}` === g.key && r.status !== 'storniert' && r.status !== 'nicht abgeholt')
      .map(r => r.id);
    if (ids.length === 0) { ladeBestellungen(); return; }
    await tryRestoreSession();
    // DELETE avoids the status check-constraint issue; UPDATE ('storniert'/'verfallen') can
    // be rejected if those values are not in the DB's bestellungen_status_check constraint.
    const { error: err } = await supabase.from('Bestellungen').delete().in('id', ids);
    if (err) {
      Alert.alert('Stornierung fehlgeschlagen', err.message || 'Unbekannter Fehler. Bitte erneut versuchen.');
    } else {
      // Persist cancelled date so autoApplyAbo never re-books it for this user
      const cancelKey = `mensa_cancelled_${email}`;
      try {
        const existing = await getItemAsync(cancelKey);
        const dates: string[] = existing ? JSON.parse(existing) : [];
        if (!dates.includes(g.bestell_datum)) dates.push(g.bestell_datum);
        await setItemAsync(cancelKey, JSON.stringify(dates));
      } catch {}

      // If the cancelled order is for today, add the cancelled count to FreieEssen
      try {
        const today = todayIso();
        if (g.bestell_datum === today) {
          const cancelledCount = ids.length;
          // Try find existing FreieEssen row for today
          const { data: existingFrei } = await supabase.from('FreieEssen').select('*').eq('datum', today).maybeSingle();
          if (existingFrei) {
            const newAnzahl = (existingFrei.anzahl ?? 0) + cancelledCount;
            await supabase.from('FreieEssen').update({ anzahl: newAnzahl }).eq('id', existingFrei.id);
          } else {
            // Try to find speiseplan id for the dish/date
            const { data: sp } = await supabase.from('Speiseplan').select('id').eq('Ausgabedatum', today).eq('Gerichtname', g.gericht_name).maybeSingle();
            const speiseplan_id = sp?.id ?? null;
            await supabase.from('FreieEssen').insert({ speiseplan_id, datum: today, anzahl: cancelledCount });
          }
        }
      } catch (e) {
        // don't block user flow on FreieEssen failure
        console.error('Failed to update FreieEssen on cancellation:', e);
      }

      ladeBestellungen();
      refreshBookingStatus();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
      </ScrollView>

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
    </View>
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

  const totalEdited = editMengen.studierende + editMengen.bedienstete + editMengen.gaeste;
  const nextWeekLocked = isInCurrentOrNextCalendarWeek(g.bestell_datum);
  const maxReached     = totalEdited >= MAX_BESTELLUNGEN;

  return (
    <View style={[styles.card, vergangen && styles.cardVergangen]}>
      <Text style={[styles.dateLabel, vergangen && styles.dateLabelVergangen]}>{isoToGerman(g.bestell_datum)}</Text>
      {!!g.image_url && <Image source={{ uri: g.image_url }} style={styles.mealImage} resizeMode="cover" />}
      <Text style={[styles.mealName, vergangen && styles.mealNameVergangen]}>{g.gericht_name}</Text>

      {g.status === 'abgeholt' && (
        <View style={styles.abgeholtBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.abgeholtText}>Abgeholt</Text>
        </View>
      )}

      {isEditing ? (
        <>
          <MengeRow label="Studierende" preis={preisStud} wert={editMengen.studierende} onPlus={() => onMengeChange?.('studierende', 1)} onMinus={() => onMengeChange?.('studierende', -1)} maxReached={maxReached || nextWeekLocked} />
          <MengeRow label="Bedienstete" preis={preisBed}  wert={editMengen.bedienstete} onPlus={() => onMengeChange?.('bedienstete', 1)} onMinus={() => onMengeChange?.('bedienstete', -1)} maxReached={maxReached || nextWeekLocked} />
          <MengeRow label="Gäste"       preis={preisGaes} wert={editMengen.gaeste}       onPlus={() => onMengeChange?.('gaeste', 1)}       onMinus={() => onMengeChange?.('gaeste', -1)} maxReached={maxReached || nextWeekLocked} />
          <Text style={styles.kartGesamt}>Gesamt: {editGesamt}</Text>
          {nextWeekLocked && (
            <Text style={{ color: '#666', marginBottom: 8, fontSize: 12 }}>
              Bestellungen für diese und die kommende Kalenderwoche können nicht mehr erhöht werden.
            </Text>
          )}
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
          {!vergangen && g.status !== 'abgeholt' && (
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
  const { profile, refreshBookingStatus, refreshActiveAbo, activeAbo, updateActiveAbo } = useAuthContext();
  const [authEmail, setAuthEmail] = useState<string | undefined>(undefined);
  const email = (profile?.email ?? authEmail) as string | undefined;

  useEffect(() => {
    const loadAuthEmail = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthEmail(data?.user?.email ?? undefined);
    }
    loadAuthEmail();
  }, []);

  // Lazy initializer: if context already has abo data (loaded at login), use it immediately.
  // This means reopening the accordion shows the correct values without any DB round-trip.
  const [abo, setAbo] = useState<AboSettings>(() => activeAbo ? {
    aktiv: activeAbo.aktiv,
    wochentage: activeAbo.wochentage,
    ausgeschlossene_allergene: activeAbo.ausgeschlossene_allergene,
    vegetarisch: activeAbo.vegetarisch,
    vegan: activeAbo.vegan,
    nutzertyp: activeAbo.nutzertyp,
  } : {
    aktiv: false, wochentage: [], ausgeschlossene_allergene: [],
    vegetarisch: false, vegan: false, nutzertyp: 'Studierende',
  });
  const [loading, setLoading]           = useState(!activeAbo);
  const [saving, setSaving]             = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [message, setMessage]           = useState('');
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const [autoOrderInfo, setAutoOrderInfo] = useState('');
  const [anleitungOffen, setAnleitungOffen] = useState(false);

  const autoApplyAbo = async (aboData: AboSettings, forEmail: string) => {
    if (!aboData.aktiv || aboData.wochentage.length === 0) return;
    const wochentage = getUebernachsteWoche();
    if (wochentage.length === 0) return;
    // Respect dates the user manually cancelled — don't re-book them
    let cancelledDates: string[] = [];
    try {
      const stored = await getItemAsync(`mensa_cancelled_${forEmail}`);
      if (stored) cancelledDates = JSON.parse(stored);
    } catch {}
    const { data: speiseplan } = await supabase
      .from('Speiseplan').select('*').in('Ausgabedatum', wochentage);
    const authResult = await supabase.auth.getUser();
    const authUserId = authResult.data?.user?.id ?? null;
    const rows: Omit<BestellungRow, 'id'>[] = [];
    for (const meal of (speiseplan ?? []) as SpeiseplanEintrag[]) {
      const dow = isoToDate(meal.Ausgabedatum).getDay();
      if (!aboData.wochentage.includes(dow)) continue;
      if (cancelledDates.includes(meal.Ausgabedatum)) continue;
      if (!matchesAbo(aboData, meal)) continue;
      const { data: existing } = await supabase
        .from('Bestellungen').select('id')
        .eq('email', forEmail).eq('bestell_datum', meal.Ausgabedatum).limit(1);
      if (existing && existing.length > 0) continue;
      const kategorie = aboData.nutzertyp === 'Externe' ? 'Gäste' : aboData.nutzertyp;
      const preis = aboData.nutzertyp === 'Studierende' ? meal.PreisStudierende
                  : aboData.nutzertyp === 'Bedienstete' ? meal.PreisBedienstet : meal.PreisGast;
      rows.push({
        email: forEmail, gericht_name: meal.Gerichtname, bestell_datum: meal.Ausgabedatum,
        kategorie, preis, image_url: meal.image_url, auth_user_id: authUserId as any, status: 'bestellt',
      });
    }
    if (rows.length > 0) {
      const { error } = await supabase.from('Bestellungen').insert(rows);
      if (!error) {
        refreshBookingStatus();
        const tage = [...new Set(rows.map(r => WEEKDAY_SHORT[isoToDate(r.bestell_datum).getDay()] ?? '?'))].join(' · ');
        setAutoOrderInfo(`Automatisch bestellt für übernächste Woche: ${tage} (${rows.length} Bestellung${rows.length !== 1 ? 'en' : ''})`);
      }
    }
  };

  // ── Abo laden (nur wenn Kontext leer) ─────────────────────────────────────

  useEffect(() => {
    if (!email) { setLoading(false); return; }

    if (activeAbo) {
      // Context already has data (loaded at login) — use it directly, skip DB
      setLoading(false);
      if (activeAbo.aktiv && activeAbo.wochentage.length > 0) {
        autoApplyAbo({ aktiv: activeAbo.aktiv, wochentage: activeAbo.wochentage,
          ausgeschlossene_allergene: activeAbo.ausgeschlossene_allergene,
          vegetarisch: activeAbo.vegetarisch, vegan: activeAbo.vegan, nutzertyp: activeAbo.nutzertyp,
        }, email);
      }
      return;
    }

    // Fallback: context empty (user has no abo yet) — query DB directly
    const load = async () => {
      await tryRestoreSession();
      const { data, error } = await supabase
        .from('bestellabos').select('*').eq('email', email).maybeSingle();
      if (data) {
        const loaded: AboSettings = {
          aktiv: data.aktiv ?? false,
          wochentage: data.wochentage ?? [],
          ausgeschlossene_allergene: data.ausgeschlossene_allergene ?? [],
          vegetarisch: data.vegetarisch ?? false,
          vegan: data.vegan ?? false,
          nutzertyp: (data.nutzertyp ?? 'Studierende') as AboSettings['nutzertyp'],
        };
        setAbo(loaded);
        updateActiveAbo(loaded); // Also populate context for header reminder
        if (loaded.aktiv && loaded.wochentage.length > 0) {
          autoApplyAbo(loaded, email);
        }
      } else if (error) {
        setMessage(`Ladefehler: ${error.message}`);
      }
      setLoading(false);
    };
    load();
  }, [email]);

  // ── Speichern ──────────────────────────────────────────────────────────────

  const doUpsert = async (aboData: AboSettings): Promise<string | null> => {
    if (!email) return 'Keine E-Mail-Adresse.';
    await tryRestoreSession();
    const authResult = await supabase.auth.getUser();
    const authUserId = authResult.data?.user?.id ?? null;
    // Versuch 1: RPC
    const { error: rpcErr } = await supabase.rpc('upsert_bestellabo', {
      p_email: email, p_auth_user_id: authUserId,
      p_aktiv: aboData.aktiv, p_wochentage: aboData.wochentage,
      p_ausgeschlossene_allergene: aboData.ausgeschlossene_allergene,
      p_vegetarisch: aboData.vegetarisch, p_vegan: aboData.vegan, p_nutzertyp: aboData.nutzertyp,
    });
    if (!rpcErr) return null;
    // Versuch 2: direktes Upsert
    const { error: upsertErr } = await supabase
      .from('bestellabos')
      .upsert({
        email, auth_user_id: authUserId, aktiv: aboData.aktiv,
        wochentage: aboData.wochentage, ausgeschlossene_allergene: aboData.ausgeschlossene_allergene,
        vegetarisch: aboData.vegetarisch, vegan: aboData.vegan, nutzertyp: aboData.nutzertyp,
      }, { onConflict: 'email' });
    return upsertErr ? `RPC: ${rpcErr.message} | Direkt: ${upsertErr.message}` : null;
  };

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

  const toggleAktiv = async (v: boolean) => {
    setToggleSaving(true);
    const newAbo = { ...abo, aktiv: v };
    setAbo(newAbo);
    const err = await doUpsert(newAbo);
    setToggleSaving(false);
    if (err) {
      setMessage(`Fehler beim Aktivieren: ${err}`);
      setAbo(prev => ({ ...prev, aktiv: !v })); // Revert bei Fehler
    } else {
      // Update context immediately so header reminder shows/hides without DB round-trip
      updateActiveAbo(newAbo);
      refreshActiveAbo(); // Async DB sync in background (no await needed)
      if (v && email && newAbo.wochentage.length > 0) autoApplyAbo(newAbo, email);
    }
  };

  const speichern = async () => {
    setSaving(true);
    setMessage('');
    setSaveSuccess(false);
    const err = await doUpsert(abo);
    setSaving(false);
    if (err) {
      setMessage(`Fehler: ${err}`);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      updateActiveAbo(abo);
      refreshActiveAbo();
      // If abo is active, immediately re-apply with the new criteria so new days get booked
      if (abo.aktiv && email && abo.wochentage.length > 0) {
        autoApplyAbo(abo, email);
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <ActivityIndicator color="#0066cc" style={{ marginTop: 30 }} />;

  const isError = (msg: string) =>
    msg.startsWith('Fehler') || msg.startsWith('Ladefehler') || msg.startsWith('RPC');

  return (
    <View style={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Bestellabo</Text>

      {/* Info-Bereich: Was ist ein Bestellabo? (ausklappbar) */}
      <View style={styles.aboInfoBox}>
        <TouchableOpacity style={styles.aboInfoHeader} onPress={() => setAnleitungOffen(v => !v)}>
          <Text style={styles.aboInfoTitle}>Was ist ein Bestellabo?</Text>
          <Ionicons name={anleitungOffen ? 'chevron-up' : 'chevron-down'} size={18} color="#18345d" />
        </TouchableOpacity>
        {anleitungOffen && (
          <>
            <Text style={styles.aboInfoText}>
              Ein Bestellabo ermöglicht automatische Bestellungen an ausgewählten Wochentagen – ohne wöchentlich manuell bestellen zu müssen.
            </Text>
            <Text style={styles.aboInfoSubTitle}>So funktioniert es:</Text>
            <Text style={styles.aboInfoItem}>{'• '}Wochentage und Kriterien festlegen (Allergene, vegetarisch/vegan).</Text>
            <Text style={styles.aboInfoItem}>{'• '}„Einstellungen speichern" – Kriterien speichern.</Text>
            <Text style={styles.aboInfoItem}>{'• '}„Abo aktiv" einschalten – das Abo läuft ab sofort automatisch jede Woche.</Text>
            <Text style={styles.aboInfoItem}>{'• '}Das Abo bestellt automatisch, wenn das Tagesangebot Ihren Kriterien entspricht.</Text>
            <Text style={styles.aboInfoSubTitle}>Bitte beachten:</Text>
            <Text style={styles.aboInfoItem}>{'• '}Bitte deaktivieren Sie das Abo während Ferien oder Urlaub.</Text>
            <Text style={styles.aboInfoItem}>{'• '}Wenn Sie an einem Tag nicht kommen, müssen Sie die Bestellung manuell stornieren.</Text>
            <Text style={styles.aboInfoItem}>{'• '}Abo-Bestellungen zählen zum Tages-Limit (max. 3 Essen pro Tag).</Text>
            <Text style={styles.aboInfoBeispiel}>
              Beispiel: Mo + Mi, vegetarisch, ohne Nüsse → Das Abo bestellt jeden Mo und Mi automatisch, sofern das Gericht vegetarisch und nussfrei ist.
            </Text>
          </>
        )}
      </View>

      {/* Abo-Auftrag: Ergebnis der letzten automatischen Bestellung */}
      {!!autoOrderInfo && (
        <View style={styles.aboAutoOrderBadge}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#226622" />
          <Text style={styles.aboAutoOrderText} numberOfLines={1}>{autoOrderInfo}</Text>
        </View>
      )}

      {/* Warnhinweis */}
      <View style={styles.aboHinweis}>
        <Ionicons name="warning-outline" size={18} color="#a05000" style={{ marginTop: 1 }} />
        <Text style={styles.aboHinweisText}>
          Bitte deaktivieren Sie das Abo während Ferien oder Urlaub. An einzelnen Tagen: Bestellung manuell stornieren.
        </Text>
      </View>

      {/* ── 1. Einstellungen ──────────────────────────────────────────────── */}
      <Text style={styles.aboSectionDivider}>Einstellungen</Text>

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

      {/* Ernährungsfilter */}
      <View style={styles.aboRow}>
        <Text style={styles.aboLabel}>Nur vegetarisch</Text>
        <Switch value={abo.vegetarisch} onValueChange={v => setAbo(prev => ({ ...prev, vegetarisch: v }))} trackColor={{ true: '#18345d' }} />
      </View>
      <View style={styles.aboRow}>
        <Text style={styles.aboLabel}>Nur vegan</Text>
        <Switch value={abo.vegan} onValueChange={v => setAbo(prev => ({ ...prev, vegan: v }))} trackColor={{ true: '#18345d' }} />
      </View>

      {/* Mein Status (Nutzertyp) */}
      <Text style={styles.aboSectionLabel}>Mein Status</Text>
      <View style={styles.nutzerTypRow}>
        {(['Studierende', 'Bedienstete', 'Externe'] as const).map(typ => (
          <TouchableOpacity
            key={typ}
            style={[styles.tagChip, abo.nutzertyp === typ && styles.tagChipActive]}
            onPress={() => setAbo(prev => ({ ...prev, nutzertyp: typ }))}
          >
            <Text style={[styles.tagChipText, abo.nutzertyp === typ && styles.tagChipTextActive]}>
              {typ}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.btnDisabled]}
        onPress={speichern}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Einstellungen speichern</Text>}
      </TouchableOpacity>
      <Text style={styles.aboSaveHint}>Speichert Wochentage, Allergene und Ernährungsfilter.</Text>

      {saveSuccess && (
        <View style={styles.aboSaveBadge}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#226622" />
          <Text style={styles.aboSaveBadgeText}>
            Einstellungen gespeichert (Wochentage, Allergene, vegan/vegetarisch, Nutzerstatus).
          </Text>
        </View>
      )}

      {/* ── 2. Abo aktivieren ─────────────────────────────────────────────── */}
      <Text style={styles.aboSectionDivider}>Abo aktivieren</Text>

      <View style={styles.aboStatusBlock}>
        <View style={[styles.aboRow, { marginBottom: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aboLabel}>Abo aktiv</Text>
            <Text style={styles.aboLabelHint}>Schaltet automatische Bestellungen ein/aus</Text>
          </View>
          {toggleSaving
            ? <ActivityIndicator color="#18345d" size="small" />
            : <Switch value={abo.aktiv} onValueChange={toggleAktiv} trackColor={{ true: '#18345d' }} />
          }
        </View>
        <View style={[styles.aboStatusChip, abo.aktiv ? styles.aboStatusChipAktiv : styles.aboStatusChipInaktiv]}>
          <Text style={[styles.aboStatusChipText, abo.aktiv ? styles.aboStatusChipTextAktiv : styles.aboStatusChipTextInaktiv]}>
            {abo.aktiv
              ? 'Abo läuft – Bestellungen werden automatisch jede Woche aufgegeben.'
              : 'Abo ist deaktiviert – keine automatischen Bestellungen.'}
          </Text>
        </View>
      </View>

      {!!message && (
        <View style={[styles.aboMessageBox, isError(message) ? styles.aboMessageBoxError : styles.aboMessageBoxSuccess]}>
          <Text style={[styles.aboMessageText, isError(message) ? styles.aboMessageTextError : styles.aboMessageTextSuccess]}>{message}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 14, paddingBottom: 140 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2277bb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a5f99',
  },
  sectionHeaderOpen: { backgroundColor: '#18345d' },
  sectionHeaderText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  nutzerTypRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

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

  abgeholtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a7a2a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  abgeholtText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

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

  // Tages-Limit
  tagesLimitBox: {
    backgroundColor: '#eef4ff', borderRadius: 8, borderWidth: 1.5,
    borderColor: '#99bbdd', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    gap: 6,
  },
  tagesLimitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagesLimitHinweis: { fontSize: 13, fontWeight: '700', color: '#18345d' },
  datumZeile: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ddeeff', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5,
  },
  datumZeileVoll:     { backgroundColor: '#fff0e0' },
  datumZeileText:     { fontSize: 12, fontWeight: '600', color: '#18345d' },
  datumZeileTextVoll: { color: '#a04000' },
  datumVollHinweis:   { fontSize: 11, fontWeight: '700', color: '#e05800' },

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

  successBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eefaee', borderRadius: 6, borderWidth: 1, borderColor: '#88cc88',
    paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10, alignSelf: 'flex-start',
  },
  successBadgeText: { fontSize: 12, fontWeight: '600', color: '#226622', flexShrink: 1 },

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

  // Abo-Badges
  aboAutoOrderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eefaee', borderRadius: 6, borderWidth: 1, borderColor: '#88cc88',
    paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10,
  },
  aboAutoOrderText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#226622' },
  aboSaveBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#eefaee', borderRadius: 6, borderWidth: 1, borderColor: '#88cc88',
    paddingVertical: 8, paddingHorizontal: 10, marginTop: 8,
  },
  aboSaveBadgeText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#226622', lineHeight: 16 },
  bestandBlock: { marginTop: 6, marginBottom: 2, gap: 3 },
  bestandZeile: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bestandZeileText: { fontSize: 13, fontWeight: '600', color: '#226622' },
  aboTag: { fontSize: 11, color: '#888', fontWeight: '500' },

  // Abo-Info-Box
  aboInfoBox: {
    backgroundColor: '#eef4ff', borderRadius: 8, borderWidth: 1.5,
    borderColor: '#99bbdd', padding: 14, marginBottom: 14,
  },
  aboInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aboInfoTitle:    { fontSize: 15, fontWeight: '700', color: '#18345d' },
  aboInfoSubTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 10, marginBottom: 4 },
  aboInfoText:     { fontSize: 13, color: '#444', lineHeight: 18, marginBottom: 4 },
  aboInfoItem:     { fontSize: 13, color: '#444', lineHeight: 20 },
  aboInfoBeispiel: { fontSize: 12, fontStyle: 'italic', color: '#555', marginTop: 10, lineHeight: 16 },

  // Abo-spezifisch
  aboHinweis: {
    flexDirection: 'row', gap: 8, backgroundColor: '#fff7e6',
    borderRadius: 8, borderWidth: 1.5, borderColor: '#e0a040',
    padding: 12, marginBottom: 16,
  },
  aboHinweisText: { flex: 1, fontSize: 13, color: '#7a3f00', lineHeight: 18 },

  aboStatusBlock: {
    borderRadius: 8, borderWidth: 1.5, borderColor: '#99bbdd',
    backgroundColor: '#f5f8ff', padding: 12, marginBottom: 16, gap: 10,
  },
  aboStatusChip: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7,
  },
  aboStatusChipAktiv:      { backgroundColor: '#e0f5e0', borderWidth: 1, borderColor: '#66bb66' },
  aboStatusChipInaktiv:    { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#cccccc' },
  aboStatusChipText:       { fontSize: 12, lineHeight: 16 },
  aboStatusChipTextAktiv:  { color: '#226622', fontWeight: '600' },
  aboStatusChipTextInaktiv:{ color: '#666666' },

  aboSectionDivider: {
    fontSize: 12, fontWeight: '700', color: '#555',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 12, marginTop: 4,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  aboLabelHint:   { fontSize: 11, color: '#888', marginTop: 1 },
  aboSaveHint:    { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 4, marginBottom: 4 },
  aboApplyHint:   { fontSize: 11, color: '#a06000', textAlign: 'center', marginTop: 4 },

  aboMessageBox: {
    borderRadius: 8, borderWidth: 1.5, padding: 12, marginTop: 12,
  },
  aboMessageBoxSuccess: { backgroundColor: '#e8f8e8', borderColor: '#66bb66' },
  aboMessageBoxError:   { backgroundColor: '#fff0f0', borderColor: '#cc6666' },
  aboMessageText:       { fontSize: 13, lineHeight: 18 },
  aboMessageTextSuccess:{ color: '#226622' },
  aboMessageTextError:  { color: '#aa2222' },

  aboRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
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
