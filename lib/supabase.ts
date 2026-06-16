import { createClient } from '@supabase/supabase-js'
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getItemAsync(key),
  setItem: (key: string, value: string) => setItemAsync(key, value),
  removeItem: (key: string) => deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://212.71.201.100:8000',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_BLNqsIxusJ6bMGSm772Pbz_GIZj85mZ',
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  }
);