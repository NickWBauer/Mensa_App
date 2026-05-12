import { createClient } from '@supabase/supabase-js'
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getItemAsync(key),
  setItem: (key: string, value: string) => setItemAsync(key, value),
  removeItem: (key: string) => deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://qigqefdghcxerfpzxhmj.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ3FlZmRnaGN4ZXJmcHp4aG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzQ3MTcsImV4cCI6MjA5MTkxMDcxN30.uaGfZIjjOyVEmo0dX5GQrrc6rtGGvSrAlKCnGdmWdnI',
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  }
);

// Datenbank link https://qigqefdghcxerfpzxhmj.supabase.co

// API-Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ3FlZmRnaGN4ZXJmcHp4aG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzQ3MTcsImV4cCI6MjA5MTkxMDcxN30.uaGfZIjjOyVEmo0dX5GQrrc6rtGGvSrAlKCnGdmWdnI