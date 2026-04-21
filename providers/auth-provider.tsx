import { AuthContext } from '@/hooks/use-auth-context'
import { supabase } from '@/lib/supabase'
import { PropsWithChildren, useEffect, useState } from 'react'

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>()
  const [profile, setProfile] = useState<any>()
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Fetch the claims once, and subscribe to auth state changes
  useEffect(() => {
    const fetchClaims = async () => {
      setIsLoading(true)

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error fetching session:', error)
      }

      setClaims(session?.user?.id ? { sub: session.user.id } : null)
      setIsLoading(false)
    }

    fetchClaims()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      console.log('Auth state changed:', { event: _event })
      //Bei Sign Out werden Claims(Hintergrunddaten) direkt aktualisiert, behebt Sign-Out Fehler
      if (_event === 'SIGNED_OUT') {
        setClaims(null)
        setIsLoading(false)
      return
    }
      console.log('Session nach State Change:', _session?.user?.id)
      setClaims(_session?.user?.id ? { sub: _session.user.id } : null)
      setIsLoading(false)

    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch the profile when the claims change
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)

      if (claims) {
        const { data } = await supabase.from('profiles').select('*').eq('id', claims.sub).single()

        setProfile(data)
      } else {
        setProfile(null)
      }

      setIsLoading(false)
    }

    fetchProfile()
  }, [claims])

  return (
    <AuthContext.Provider
      value={{
        claims,
        isLoading,
        profile,
        isLoggedIn: claims != null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}