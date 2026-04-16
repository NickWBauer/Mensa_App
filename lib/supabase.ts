import { createClient } from '@supabase/supabase-js'
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    console.debug('getItem', { key, getItemAsync })
    return getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    if (value.length > 2048) {
      console.warn(
        'Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.'
      )
    }
    return setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    return deleteItemAsync(key)
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://qigqefdghcxerfpzxhmj.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ3FlZmRnaGN4ZXJmcHp4aG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzQ3MTcsImV4cCI6MjA5MTkxMDcxN30.uaGfZIjjOyVEmo0dX5GQrrc6rtGGvSrAlKCnGdmWdnI',
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);

// Datenbank link https://qigqefdghcxerfpzxhmj.supabase.co

// API-Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ3FlZmRnaGN4ZXJmcHp4aG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzQ3MTcsImV4cCI6MjA5MTkxMDcxN30.uaGfZIjjOyVEmo0dX5GQrrc6rtGGvSrAlKCnGdmWdnI