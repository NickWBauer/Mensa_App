import LogoHeader from '@/components/logo-header';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type StudentRow = {
  'E-Mail': string;
};

type BestellungRow = {
  id: number;
  email: string;
  gericht_name: string;
  bestell_datum: string;
  kategorie: string;
  preis: string;
  auth_user_id?: string | null;
  status?: 'bestellt' | 'abgeholt' | 'verfallen' | 'storniert';
};

type BestellungGruppe = {
  gericht_name: string;
  bestell_datum: string;
  studierende: number;
  bedienstete: number;
  gaeste: number;
  ids: number[];
  idsByKat: {
    studierende: number[];
    bedienstete: number[];
    gaeste: number[];
  };
};

type ScanErgebnis = {
  rzKennung: string;
  gruppen: BestellungGruppe[];
  alleIds: number[];
  rows: BestellungRow[];
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayIso() { return new Date().toISOString().split('T')[0]; }

function isBeforePickupDeadline() {
  const now = new Date();
  const deadline = new Date();
  deadline.setHours(14, 0, 0, 0);
  deadline.setMinutes(0);
  deadline.setSeconds(0);
  deadline.setMilliseconds(0);
  return now < deadline;
}

async function updateOrderStatus(ids: number[], status: 'abgeholt' | 'verfallen' | 'storniert' | 'bestellt') {
  if (ids.length === 0) return { error: null };
  return supabase.from('Bestellungen').update({ status }).in('id', ids);
}

async function handleDeadlineExpiredForOrders(rows: BestellungRow[]) {
  if (rows.length === 0) return;
  const ids = rows.map(r => r.id);

  const { error: updateError } = await updateOrderStatus(ids, 'verfallen');
  if (updateError) {
    Alert.alert('Fehler', `Abholfrist konnte nicht verarbeitet werden: ${updateError.message}`);
    return;
  }

  Alert.alert('Abholfrist abgelaufen', 'Die Abholzeit ist abgelaufen. Die Bestellung wurde storniert.');
}

function gruppiereBestellungen(rows: BestellungRow[]): BestellungGruppe[] {
  const map: Record<string, BestellungGruppe> = {};

  for (const r of rows) {
    const key = `${r.gericht_name}|${r.bestell_datum}`;

    if (!map[key]) {
      map[key] = {
        gericht_name: r.gericht_name,
        bestell_datum: r.bestell_datum,
        studierende: 0,
        bedienstete: 0,
        gaeste: 0,
        ids: [],
        idsByKat: {
          studierende: [],
          bedienstete: [],
          gaeste: [],
        },
      };
    }

    map[key].ids.push(r.id);

    if (r.kategorie === 'Studierende') {
      map[key].studierende++;
      map[key].idsByKat.studierende.push(r.id);
    } else if (r.kategorie === 'Bedienstete') {
      map[key].bedienstete++;
      map[key].idsByKat.bedienstete.push(r.id);
    } else if (r.kategorie === 'Gäste') {
      map[key].gaeste++;
      map[key].idsByKat.gaeste.push(r.id);
    }
  }

  return Object.values(map);
}

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [ladung, setLadung] = useState(false);

  const [ergebnis, setErgebnis] = useState<ScanErgebnis | null>(null);
  const [zeigeBestaetigung, setZeigeBestaetigung] = useState(false);
  const [zeigeAnpassen, setZeigeAnpassen] = useState(false);

  const [angepasst, setAngepasst] = useState<
    Record<string, { studierende: string; bedienstete: string; gaeste: string }>
  >({});

  const cooldownRef = useRef(false);

  const handleScan = async (rzKennung: string) => {
    if (cooldownRef.current || ladung) return;

    cooldownRef.current = true;
    setScanning(false);
    setLadung(true);

    try {
      const today = todayIso();

      const [{ data: studentFull }, { data: bestellungen }] = await Promise.all([
        supabase
          .from('StudentenHochschule')
          .select('E-Mail')
          .eq('RZ-Kennung', rzKennung)
          .maybeSingle(),

        supabase
          .from('Bestellungen')
          .select('id, email, gericht_name, bestell_datum, kategorie, preis, auth_user_id, status')
          .eq('bestell_datum', today)
          .eq('status', 'bestellt')
          .order('gericht_name'),
      ]);

      const email = (studentFull as { 'E-Mail'?: string } | null)?.['E-Mail'];
      const meineBestellungen = email
        ? (bestellungen ?? []).filter(b => b.email === email) as BestellungRow[]
        : [];

      if (!isBeforePickupDeadline() && meineBestellungen.length > 0) {
        await handleDeadlineExpiredForOrders(meineBestellungen);
        setTimeout(() => { cooldownRef.current = false; }, 1000);
        setLadung(false);
        return;
      }

      const gruppen = gruppiereBestellungen(meineBestellungen);
      const alleIds = meineBestellungen.map((b) => b.id);

      if (gruppen.length === 0) {
        Alert.alert(
          'Keine offenen Bestellungen',
          'Für diesen Nutzer liegt heute keine offene Vorbestellung vor.'
        );

        setTimeout(() => {
          cooldownRef.current = false;
        }, 2000);

        setLadung(false);
        return;
      }

      const init: typeof angepasst = {};

      for (const g of gruppen) {
        const key = `${g.gericht_name}|${g.bestell_datum}`;

        init[key] = {
          studierende: String(g.studierende),
          bedienstete: String(g.bedienstete),
          gaeste: String(g.gaeste),
        };
      }

      setAngepasst(init);

      setErgebnis({ rzKennung, gruppen, alleIds, rows: meineBestellungen });
    } finally {
      setLadung(false);
    }
  };

  const handleAlleAbgeholt = async () => {
    if (!ergebnis) return;

    setZeigeBestaetigung(false);
    setLadung(true);

    if (!isBeforePickupDeadline()) {
      await handleDeadlineExpiredForOrders(ergebnis.rows);
      setErgebnis(null);
      setLadung(false);
      setTimeout(() => { cooldownRef.current = false; }, 1000);
      return;
    }

    const { error } = await updateOrderStatus(ergebnis.alleIds, 'abgeholt');

    if (error) {
      Alert.alert(
        'Fehler',
        `Abholung konnte nicht gespeichert werden: ${error.message}`
      );

      setLadung(false);
      return;
    }

    setErgebnis(null);
    setLadung(false);

    setTimeout(() => {
      cooldownRef.current = false;
    }, 1000);
  };

  const handleAnpassungSpeichern = async () => {
    if (!ergebnis) return;
    if (!isBeforePickupDeadline()) {
      await handleDeadlineExpiredForOrders(ergebnis.rows as BestellungRow[]);
      setErgebnis(null);
      setLadung(false);
      setTimeout(() => { cooldownRef.current = false; }, 1000);
      return;
    }

    setZeigeAnpassen(false);
    setLadung(true);

    const abgeholtIds: number[] = [];

    for (const g of ergebnis.gruppen) {
      const key = `${g.gericht_name}|${g.bestell_datum}`;
      const a = angepasst[key];

      const verblStud = Math.max(0, Math.min(parseInt(a?.studierende ?? '0', 10) || 0, g.idsByKat.studierende.length));
      const verblBed  = Math.max(0, Math.min(parseInt(a?.bedienstete ?? '0', 10) || 0, g.idsByKat.bedienstete.length));
      const verblGaes = Math.max(0, Math.min(parseInt(a?.gaeste      ?? '0', 10) || 0, g.idsByKat.gaeste.length));

      abgeholtIds.push(
        ...g.idsByKat.studierende.slice(0, g.idsByKat.studierende.length - verblStud),
        ...g.idsByKat.bedienstete.slice(0, g.idsByKat.bedienstete.length - verblBed),
        ...g.idsByKat.gaeste.slice(0, g.idsByKat.gaeste.length - verblGaes),
      );
    }

    if (abgeholtIds.length === 0) {
      Alert.alert('Hinweis', 'Keine Bestellungen zum Abholen ausgewählt.');
      setLadung(false);
      return;
    }

    const { error } = await updateOrderStatus(abgeholtIds, 'abgeholt');

    if (error) {
      Alert.alert(
        'Fehler',
        `Abholung konnte nicht gespeichert werden: ${error.message}`
      );

      setLadung(false);
      return;
    }

    setErgebnis(null);
    setLadung(false);

    setTimeout(() => {
      cooldownRef.current = false;
    }, 1000);
  };

  if (!ergebnis) {
    if (!permission) {
      return (
        <View style={styles.container}>
          <LogoHeader />
          <ActivityIndicator color="#1a4d1a" style={{ marginTop: 40 }} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <LogoHeader />

          <View style={styles.center}>
            <Text style={styles.permText}>
              Kamera-Zugriff wird für den QR-Scanner benötigt.
            </Text>

            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Zugriff erlauben</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <LogoHeader />

        <View style={styles.scannerContainer}>
          {ladung ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#1a4d1a" />
              <Text style={styles.ladeText}>Bestellungen werden geladen…</Text>
            </View>
          ) : scanning ? (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => handleScan(data)}
              />

              <TouchableOpacity
                style={styles.abbrechenBtn}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.abbrechenText}>Abbrechen</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.center}>
              <Text style={styles.hinweisText}>QR-Code des Nutzers scannen</Text>

              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setScanning(true)}
              >
                <Text style={styles.scanBtnText}>Kamera öffnen</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  const gesamtAnzahl = ergebnis.gruppen.reduce(
    (summe, g) => summe + g.studierende + g.bedienstete + g.gaeste,
    0
  );

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.nutzerCard}>
          <Ionicons name="checkmark-circle" size={20} color="#1a7a2a" />
          <Text style={styles.nutzerKennung}>Bestellung gefunden</Text>
        </View>

        {ergebnis.gruppen.map((g) => {
          const key = `${g.gericht_name}|${g.bestell_datum}`;

          return (
            <View key={key} style={styles.bestellCard}>
              <Text style={styles.bestellDatum}>{g.bestell_datum}</Text>
              <Text style={styles.bestellGericht}>{g.gericht_name}</Text>

              {g.studierende > 0 && (
                <Text style={styles.bestellZeile}>
                  {g.studierende}× Studierende
                </Text>
              )}

              {g.bedienstete > 0 && (
                <Text style={styles.bestellZeile}>
                  {g.bedienstete}× Bedienstete
                </Text>
              )}

              {g.gaeste > 0 && (
                <Text style={styles.bestellZeile}>{g.gaeste}× Gäste</Text>
              )}
            </View>
          );
        })}

        <View style={styles.aktionenBlock}>
          <TouchableOpacity
            style={styles.abgeholtBtn}
            onPress={() => setZeigeBestaetigung(true)}
            disabled={ladung}
          >
            <Text style={styles.abgeholtBtnText}>
              {gesamtAnzahl} Bestellung{gesamtAnzahl !== 1 ? 'en' : ''} abgeholt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.anpassenBtn}
            onPress={() => setZeigeAnpassen(true)}
            disabled={ladung}
          >
            <Text style={styles.anpassenBtnText}>Abholung anpassen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.abbrechenKarteBtn}
            onPress={() => {
              setErgebnis(null);
              cooldownRef.current = false;
            }}
          >
            <Text style={styles.abbrechenKarteBtnText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal transparent visible={zeigeBestaetigung} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitel}>Abholung bestätigen</Text>

            {ergebnis.gruppen.map((g) => (
              <Text
                key={`${g.gericht_name}|${g.bestell_datum}`}
                style={styles.dialogZeile}
              >
                {g.gericht_name}: {g.studierende + g.bedienstete + g.gaeste}×
              </Text>
            ))}

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogAbbrechenBtn}
                onPress={() => setZeigeBestaetigung(false)}
              >
                <Text style={styles.dialogAbbrechenText}>Zurück</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogBestaetigenBtn}
                onPress={handleAlleAbgeholt}
              >
                <Text style={styles.dialogBestaetigenText}>Bestätigen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={zeigeAnpassen} animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.dialog, { maxHeight: '80%' }]}>
            <Text style={styles.dialogTitel}>Abholung anpassen</Text>

            <ScrollView>
              {ergebnis.gruppen.map((g) => {
                const key = `${g.gericht_name}|${g.bestell_datum}`;

                const a = angepasst[key] ?? {
                  studierende: '0',
                  bedienstete: '0',
                  gaeste: '0',
                };

                return (
                  <View key={key} style={styles.anpassenBlock}>
                    <Text style={styles.anpassenGericht}>{g.gericht_name}</Text>

                    {g.studierende > 0 && (
                      <AnpassenZeile
                        label={`Studierende — verbleibend (von ${g.studierende})`}
                        wert={a.studierende}
                        onChange={(v) =>
                          setAngepasst((prev) => ({
                            ...prev,
                            [key]: {
                              ...(prev[key] ?? a),
                              studierende: v,
                            },
                          }))
                        }
                      />
                    )}

                    {g.bedienstete > 0 && (
                      <AnpassenZeile
                        label={`Bedienstete — verbleibend (von ${g.bedienstete})`}
                        wert={a.bedienstete}
                        onChange={(v) =>
                          setAngepasst((prev) => ({
                            ...prev,
                            [key]: {
                              ...(prev[key] ?? a),
                              bedienstete: v,
                            },
                          }))
                        }
                      />
                    )}

                    {g.gaeste > 0 && (
                      <AnpassenZeile
                        label={`Gäste — verbleibend (von ${g.gaeste})`}
                        wert={a.gaeste}
                        onChange={(v) =>
                          setAngepasst((prev) => ({
                            ...prev,
                            [key]: {
                              ...(prev[key] ?? a),
                              gaeste: v,
                            },
                          }))
                        }
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogAbbrechenBtn}
                onPress={() => setZeigeAnpassen(false)}
              >
                <Text style={styles.dialogAbbrechenText}>Zurück</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogBestaetigenBtn}
                onPress={handleAnpassungSpeichern}
              >
                <Text style={styles.dialogBestaetigenText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AnpassenZeile({
  label,
  wert,
  onChange,
}: {
  label: string;
  wert: string;
  onChange: (v: string) => void;
}) {
  const num = parseInt(wert, 10) || 0;

  return (
    <View style={styles.anpassenZeile}>
      <Text style={styles.anpassenLabel}>{label}</Text>

      <View style={styles.anpassenKontrolle}>
        <Text style={styles.anpassenZahl}>{num}</Text>

        <TouchableOpacity
          style={[
            styles.anpassenMinusBtn,
            num <= 0 && styles.btnDisabled,
          ]}
          onPress={() => onChange(String(Math.max(0, num - 1)))}
          disabled={num <= 0}
        >
          <Ionicons name="remove" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 14, paddingBottom: 120 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },

  scannerContainer: { flex: 1 },
  camera: { flex: 1 },

  hinweisText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },

  ladeText: {
    fontSize: 14,
    color: '#1a4d1a',
    marginTop: 12,
  },

  permText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },

  permBtn: {
    backgroundColor: '#1a4d1a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  permBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  scanBtn: {
    backgroundColor: '#1a4d1a',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 40,
  },

  scanBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  abbrechenBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },

  abbrechenText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  nutzerCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#a8c8a0',
    padding: 14,
    marginBottom: 12,
  },

  nutzerKennung: {
    fontSize: 13,
    color: '#5a8a5a',
    marginTop: 2,
  },

  bestellCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6c8',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f6fbf6',
  },

  bestellDatum: {
    fontSize: 12,
    color: '#5a8a5a',
    marginBottom: 2,
  },

  bestellGericht: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },

  bestellZeile: {
    fontSize: 13,
    color: '#444',
  },

  aktionenBlock: {
    gap: 10,
    marginTop: 8,
  },

  abgeholtBtn: {
    backgroundColor: '#1a7a2a',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },

  abgeholtBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  anpassenBtn: {
    borderWidth: 2,
    borderColor: '#1a4d1a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },

  anpassenBtnText: {
    color: '#1a4d1a',
    fontSize: 15,
    fontWeight: '700',
  },

  abbrechenKarteBtn: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },

  abbrechenKarteBtnText: {
    color: '#666',
    fontSize: 14,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 28,
    width: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },

  dialogTitel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a4d1a',
    marginBottom: 10,
  },

  dialogZeile: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },

  dialogButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  dialogAbbrechenBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#aaa',
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center',
  },

  dialogAbbrechenText: {
    fontSize: 14,
    color: '#555',
  },

  dialogBestaetigenBtn: {
    flex: 1,
    backgroundColor: '#1a7a2a',
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center',
  },

  dialogBestaetigenText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  anpassenBlock: {
    marginBottom: 16,
  },

  anpassenGericht: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },

  anpassenZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },

  anpassenLabel: {
    flex: 1,
    fontSize: 13,
    color: '#444',
  },

  anpassenKontrolle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  anpassenZahl: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a4d1a',
    minWidth: 24,
    textAlign: 'center',
  },

  anpassenMinusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a4d1a',
    justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
