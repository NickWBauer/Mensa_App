import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentenausweisFoto() {
  const { signIn } = useAuthContext();

  const params = useLocalSearchParams();

  const username = String(params.username ?? '').trim().toLowerCase();

  const [permission, requestPermission] = useCameraPermissions();

  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [photoUri, setPhotoUri] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const [vorname, setVorname] = React.useState('');
  const [nachname, setNachname] = React.useState('');
  const [matrikelnummer, setMatrikelnummer] = React.useState('');

  const fieldsEnabled = !!photoUri && !loading;

  const cameraRef = React.useRef<CameraView | null>(null);

  async function takePhoto() {
    if (!cameraRef.current) {
      Alert.alert('Fehler', 'Kamera ist noch nicht bereit.');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) {
        Alert.alert('Fehler', 'Es konnte kein Foto aufgenommen werden.');
        return;
      }

      setPhotoUri(photo.uri);
      setCameraOpen(false);

      if (!photo.base64) {
        Alert.alert(
          'Kein Base64',
          'Das Foto wurde aufgenommen, aber nicht als Base64 erzeugt.'
        );
        return;
      }

      await runOcr(photo.base64);
    } catch (error) {
      console.log('TAKE PHOTO ERROR:', error);
      Alert.alert(
        'Fehler',
        'Beim Aufnehmen des Fotos ist ein Fehler aufgetreten.'
      );
    }
  }

  async function runOcr(base64Image: string) {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'read-student-card',
        {
          body: {
            imageBase64: base64Image,
          },
        }
      );

      if (error) {
        console.log('OCR ERROR:', error);
        Alert.alert(
          'OCR Hinweis',
          'Die Daten konnten nicht automatisch erkannt werden. Bitte manuell eintragen.'
        );
        return;
      }

      console.log('OCR DATA:', data);

      if (data?.vorname) {
        setVorname(String(data.vorname));
      }

      if (data?.nachname) {
        setNachname(String(data.nachname));
      }

      if (data?.matrikelnummer) {
        setMatrikelnummer(String(data.matrikelnummer));
      }

      if (!data?.vorname && !data?.nachname && !data?.matrikelnummer) {
        Alert.alert(
          'Keine Daten erkannt',
          'Bitte Vorname, Nachname und Matrikelnummer manuell eintragen.'
        );
      }
    } catch (error) {
      console.log('OCR CATCH ERROR:', error);
      Alert.alert(
        'OCR Hinweis',
        'Die Daten konnten nicht automatisch erkannt werden. Bitte manuell eintragen.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveStudentData() {
    if (!photoUri) {
      Alert.alert(
        'Foto erforderlich',
        'Bitte fotografieren Sie zuerst Ihren Studentenausweis.'
      );
      return;
    }

    if (!vorname || !nachname || !matrikelnummer) {
      Alert.alert(
        'Fehlende Daten',
        'Bitte Vorname, Nachname und Matrikelnummer eintragen.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setLoading(false);
        Alert.alert(
          'Fehler',
          'Der angemeldete Nutzer konnte nicht gefunden werden.'
        );
        return;
      }

      const { error } = await supabase
        .from('students')
        .update({
          vorname: vorname.trim(),
          nachname: nachname.trim(),
          matrikelnummer: matrikelnummer.trim(),
          ausweisbild: photoUri,
        })
        .eq('user_id', userData.user.id);

      if (error) {
        setLoading(false);
        Alert.alert('Fehler beim Speichern', error.message);
        return;
      }

      await signIn(username);

      setLoading(false);
    } catch (error) {
      console.log('SAVE ERROR:', error);

      setLoading(false);
      Alert.alert('Fehler', 'Die Daten konnten nicht gespeichert werden.');
    }
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <LogoHeader />
        <ActivityIndicator style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LogoHeader />

        <View style={styles.center}>
          <Text style={styles.cardTitle}>
            Kamera-Zugriff wird benötigt, um den Studentenausweis zu
            fotografieren.
          </Text>

          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Kamera erlauben</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (cameraOpen) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />

        <View style={styles.cameraButtons}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>Foto aufnehmen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCameraOpen(false)}
          >
            <Text style={styles.secondaryButtonText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>Studentenausweis</Text>
        </View>

        <ImageBackground
          source={require('@/assets/images/campus-bg.jpg')}
          style={styles.cardBackground}
          resizeMode="cover"
        >
          <View style={styles.card}>
            <Image
              source={require('@/assets/images/Logo_Hs_Esslingen.jpg')}
              style={styles.logo}
            />

            <Text style={styles.cardTitle}>
              Bitte fotografieren Sie zuerst Ihren Studentenausweis.
            </Text>

            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.preview} />
            ) : null}

            <TouchableOpacity
              style={styles.button}
              onPress={() => setCameraOpen(true)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {photoUri ? 'Foto erneut aufnehmen' : 'Kamera öffnen'}
              </Text>
            </TouchableOpacity>

            {loading ? (
              <Text style={styles.infoText}>Daten werden verarbeitet...</Text>
            ) : null}

            {!photoUri ? (
              <Text style={styles.lockedInfoText}>
                Die Eingabefelder werden erst nach dem Fotografieren des
                Studentenausweises freigeschaltet.
              </Text>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Vorname</Text>
              <TextInput
                value={vorname}
                onChangeText={setVorname}
                placeholder="Vorname"
                placeholderTextColor="#9b9b9b"
                editable={fieldsEnabled}
                style={[styles.input, !vorname && styles.inputPlaceholder, !fieldsEnabled && styles.disabledInput]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nachname</Text>
              <TextInput
                value={nachname}
                onChangeText={setNachname}
                placeholder="Nachname"
                placeholderTextColor="#9b9b9b"
                editable={fieldsEnabled}
                style={[styles.input, !nachname && styles.inputPlaceholder, !fieldsEnabled && styles.disabledInput]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Matrikelnummer</Text>
              <TextInput
                value={matrikelnummer}
                onChangeText={setMatrikelnummer}
                placeholder="Matrikelnummer"
                placeholderTextColor="#9b9b9b"
                keyboardType="number-pad"
                editable={fieldsEnabled}
                style={[styles.input, !matrikelnummer && styles.inputPlaceholder, !fieldsEnabled && styles.disabledInput]}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (!photoUri || loading) && styles.disabledButton,
              ]}
              onPress={saveStudentData}
              disabled={loading || !photoUri}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Wird gespeichert...' : 'Daten speichern'}
              </Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },

  titleBar: {
    width: '100%',
    backgroundColor: '#DDEEFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },

  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },

  cardBackground: {
    alignSelf: 'stretch',
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    padding: 24,
    alignItems: 'center',
  },

  logo: {
    width: 180,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },

  preview: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#eeeeee',
  },

  inputContainer: {
    width: '100%',
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 6,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c6c6c6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
  },

  inputPlaceholder: {
    fontSize: 13,
    fontWeight: '400',
  },

  disabledInput: {
    backgroundColor: '#eeeeee',
    color: '#888888',
  },

  button: {
    width: '100%',
    backgroundColor: '#18345d',
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 14,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

  secondaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
  },

  secondaryButtonText: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 15,
  },

  camera: {
    flex: 1,
  },

  cameraButtons: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 24,
  },

  infoText: {
    color: '#18345d',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },

  lockedInfoText: {
    color: '#666666',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
});