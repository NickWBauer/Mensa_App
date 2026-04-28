import LogoHeader from '@/components/logo-header';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  contentContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    color: '#1a1a1a',
  },
  inputFocus: {
    borderColor: '#0066cc',
    backgroundColor: '#fafbff',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#0066cc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#99ccff',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
});

export default function SetName() {
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const router = useRouter();
  const { claims, refetchProfile } = useAuthContext();

  async function saveName() {
    if (!name.trim()) {
      console.log('Bitte geben Sie einen Namen ein');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', claims?.sub);

      if (error) {
        console.log('Error saving name:', error.message);
      } else {
        await refetchProfile(); // Refetch the profile to update the context
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <LogoHeader />
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>Hey du! 👋</Text>

        <Text style={styles.descriptionText}>
          Cool, dass du dich für die Mensa-App der Hochschule Esslingen entschieden hast. Wie sollen wir dich zukünftig nennen?
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Dein Name</Text>
          <TextInput
            style={[styles.input, isFocused && styles.inputFocus]}
            onChangeText={(text) => setName(text)}
            value={name}
            placeholder="z.B. Max Mustermann"
            placeholderTextColor="#999999"
            editable={!loading}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            disabled={loading || !name.trim()}
            onPress={() => saveName()}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Wird gespeichert...' : 'Weiter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipButtonText}>Später entscheiden</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
