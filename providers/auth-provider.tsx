import { AuthContext } from '@/hooks/use-auth-context'
import { supabase } from '@/lib/supabase'
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store'
import { PropsWithChildren, useEffect, useState } from 'react'

const SESSION_KEY = 'mensa_rz_kennung'
const ACCESS_TOKEN_KEY = 'mensa_access_token'
const REFRESH_TOKEN_KEY = 'mensa_refresh_token'

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>()
  const [profile, setProfile] = useState<any>()
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadProfile = async (rzKennung: string) => {
    const [{ data: student }, { data: registered }] = await Promise.all([
      supabase.from('StudentenHochschule').select('*').eq('RZ-Kennung', rzKennung).single(),
      supabase.from('RegistriertePersonen').select('id').eq('RZ-Kennung', rzKennung).maybeSingle(),
    ])
    setProfile(student)
    setIsVerified(!!registered)
  }

  const restoreSupabaseSession = async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        getItemAsync(ACCESS_TOKEN_KEY),
        getItemAsync(REFRESH_TOKEN_KEY),
      ])
      if (!accessToken || !refreshToken) return

      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

      // Aktualisierte Tokens nach möglichem Refresh speichern
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token && session?.refresh_token) {
        await Promise.all([
          setItemAsync(ACCESS_TOKEN_KEY, session.access_token),
          setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token),
        ])
      }
    } catch {
      // Ohne Auth-Session fortfahren
    }
  }

  useEffect(() => {
    setClaims(null)
    setIsLoading(false)
  }, [])

  const signIn = async (rzKennung: string) => {
    await setItemAsync(SESSION_KEY, rzKennung)
    setClaims({ sub: rzKennung })
    await Promise.all([
      loadProfile(rzKennung),
      restoreSupabaseSession(),
    ])
  }

  const signOut = async () => {
    await Promise.all([
      deleteItemAsync(SESSION_KEY),
      deleteItemAsync(ACCESS_TOKEN_KEY),
      deleteItemAsync(REFRESH_TOKEN_KEY),
      supabase.auth.signOut(),
    ])
    setClaims(null)
    setProfile(null)
    setIsVerified(false)
  }

  const refetchProfile = async () => {
    if (claims?.sub) {
      await loadProfile(claims.sub)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        claims,
        isLoading,
        profile,
        isLoggedIn: claims != null,
        isVerified,
        signIn,
        signOut,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
