import { createClient } from '@supabase/supabase-js';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getItemAsync(key),
  setItem: (key: string, value: string) => setItemAsync(key, value),
  removeItem: (key: string) => deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://212.71.201.100:8000',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgxNTk4NTIzLCJleHAiOjE5MzkyNzg1MjN9.uv8Wigy92Vg448yYm5GXSCnvZBfBPBFZy96CBtkCD5M',
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  }
);