import { AuthContext } from '@/hooks/use-auth-context'
import { supabase } from '@/lib/supabase'
import { deleteItemAsync, setItemAsync } from 'expo-secure-store'
import { PropsWithChildren, useEffect, useState } from 'react'

const SESSION_KEY = 'mensa_rz_kennung'

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

  useEffect(() => {
    setClaims(null)
    setIsLoading(false)
  }, [])

  const signIn = async (rzKennung: string) => {
    await setItemAsync(SESSION_KEY, rzKennung)
    setClaims({ sub: rzKennung })
    await loadProfile(rzKennung)
  }

  const signOut = async () => {
    await Promise.all([
      deleteItemAsync(SESSION_KEY),
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
