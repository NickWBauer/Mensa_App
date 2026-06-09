import { ActiveAboInfo, BookingStatus } from '@/components/logo-header'
import { AuthContext } from '@/hooks/use-auth-context'
import { supabase } from '@/lib/supabase'
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store'
import { PropsWithChildren, useEffect, useRef, useState } from 'react'

const SESSION_KEY = 'mensa_rz_kennung'
export const ACCESS_TOKEN_KEY = 'mensa_access_token'
export const REFRESH_TOKEN_KEY = 'mensa_refresh_token'
const ABO_CACHE_KEY = 'mensa_abo_cache'

function nextWeekdayIso(): string {
  const d = new Date()
  do { d.setDate(d.getDate() + 1) } while (d.getDay() === 0 || d.getDay() === 6)
  return d.toISOString().split('T')[0]
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>()
  const [profile, setProfile] = useState<any>()
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null)
  const [activeAbo, setActiveAbo] = useState<ActiveAboInfo>(null)

  const emailRef = useRef<string | undefined>(undefined)

  const fetchAndSetBookingStatus = async (email: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('Bestellungen')
      .select('bestell_datum, status')
      .eq('email', email)
      .gte('bestell_datum', today)

    const rows = (data ?? []) as { bestell_datum: string; status?: string }[]
    const now = new Date()
    const pickupStart = new Date(); pickupStart.setHours(11, 0, 0, 0)
    const pickupEnd   = new Date(); pickupEnd.setHours(13, 15, 0, 0)
    const isInPickupWindow = now >= pickupStart && now < pickupEnd
    const isPickupOver     = now >= pickupEnd
    const nextDate = isPickupOver ? nextWeekdayIso() : today
    const hasBooking = rows.some(
      r => r.bestell_datum === nextDate && (r.status === 'bestellt' || !r.status),
    )
    if (isInPickupWindow && hasBooking) setBookingStatus('orange')
    else if (hasBooking) setBookingStatus('gruen')
    else setBookingStatus('rot')
  }

  const fetchAndSetActiveAbo = async (email: string) => {
    try {
      // Ensure auth session is active (RLS may require it)
      try {
        const [at, rt] = await Promise.all([
          getItemAsync(ACCESS_TOKEN_KEY),
          getItemAsync(REFRESH_TOKEN_KEY),
        ])
        if (at && rt) await supabase.auth.setSession({ access_token: at, refresh_token: rt })
      } catch {}

      const { data } = await supabase
        .from('bestellabos')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (data) {
        const info: NonNullable<ActiveAboInfo> = {
          aktiv: data.aktiv ?? false,
          wochentage: data.wochentage ?? [],
          ausgeschlossene_allergene: data.ausgeschlossene_allergene ?? [],
          vegetarisch: data.vegetarisch ?? false,
          vegan: data.vegan ?? false,
          nutzertyp: (data.nutzertyp ?? 'Studierende') as 'Studierende' | 'Bedienstete' | 'Externe',
        }
        setActiveAbo(info)
        // Keep cache up-to-date with DB
        setItemAsync(ABO_CACHE_KEY, JSON.stringify(info)).catch(() => {})
      } else {
        // DB returned nothing — fall back to local cache so header keeps showing
        try {
          const cached = await getItemAsync(ABO_CACHE_KEY)
          if (cached) {
            setActiveAbo(JSON.parse(cached) as NonNullable<ActiveAboInfo>)
          } else {
            setActiveAbo(null)
          }
        } catch {
          setActiveAbo(null)
        }
      }
    } catch {
      // On network error, try cache before giving up
      try {
        const cached = await getItemAsync(ABO_CACHE_KEY)
        if (cached) setActiveAbo(JSON.parse(cached) as NonNullable<ActiveAboInfo>)
        else setActiveAbo(null)
      } catch {
        setActiveAbo(null)
      }
    }
  }

  const loadProfile = async (rzKennung: string) => {
    const [{ data: student }, { data: registered }, { data: admin }] = await Promise.all([
      supabase.from('StudentenHochschule').select('*').eq('RZ-Kennung', rzKennung).maybeSingle(),
      supabase.from('RegistriertePersonen').select('id').eq('RZ-Kennung', rzKennung).maybeSingle(),
      supabase.from('AdminNutzer').select('*').eq('RZ-Kennung', rzKennung).maybeSingle(),
    ])

    if (admin) {
      setProfile(admin)
      setIsAdmin(true)
      setIsVerified(true)
      setBookingStatus(null)
      setActiveAbo(null)
    } else {
      setProfile(student)
      setIsAdmin(false)
      setIsVerified(!!registered)
      const email = student?.['E-Mail'] as string | undefined
      emailRef.current = email
      if (email) {
        await fetchAndSetBookingStatus(email)
      }
    }
  }

  const restoreSupabaseSession = async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        getItemAsync(ACCESS_TOKEN_KEY),
        getItemAsync(REFRESH_TOKEN_KEY),
      ])
      if (!accessToken || !refreshToken) return

      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

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
    const restoreSession = async () => {
      try {
        const rzKennung = await getItemAsync(SESSION_KEY)
        if (rzKennung) {
          await Promise.all([
            loadProfile(rzKennung),
            restoreSupabaseSession(),
          ])
          // Abo nach Session-Wiederherstellung laden (benötigt auth.uid())
          if (emailRef.current) await fetchAndSetActiveAbo(emailRef.current)
          setClaims({ sub: rzKennung })
        } else {
          setClaims(null)
        }
      } catch {
        setClaims(null)
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  const signIn = async (rzKennung: string) => {
    await setItemAsync(SESSION_KEY, rzKennung)
    await Promise.all([
      loadProfile(rzKennung),
      restoreSupabaseSession(),
    ])
    if (emailRef.current) await fetchAndSetActiveAbo(emailRef.current)
    setClaims({ sub: rzKennung })
  }

  const signOut = async () => {
    await Promise.all([
      deleteItemAsync(SESSION_KEY),
      deleteItemAsync(ACCESS_TOKEN_KEY),
      deleteItemAsync(REFRESH_TOKEN_KEY),
      supabase.auth.signOut(),
    ])
    emailRef.current = undefined
    setClaims(null)
    setProfile(null)
    setIsVerified(false)
    setIsAdmin(false)
    setBookingStatus(null)
    setActiveAbo(null)
  }

  const refetchProfile = async () => {
    if (claims?.sub) {
      await loadProfile(claims.sub)
    }
  }

  const refreshBookingStatus = async () => {
    const email = emailRef.current
    if (!email) return
    await fetchAndSetBookingStatus(email)
  }

  const refreshActiveAbo = async () => {
    const email = emailRef.current
    if (!email) return
    await fetchAndSetActiveAbo(email)
  }

  const updateActiveAbo = (info: ActiveAboInfo) => {
    setActiveAbo(info)
    if (info) {
      setItemAsync(ABO_CACHE_KEY, JSON.stringify(info)).catch(() => {})
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
        isAdmin,
        bookingStatus,
        activeAbo,
        signIn,
        signOut,
        refetchProfile,
        refreshBookingStatus,
        refreshActiveAbo,
        updateActiveAbo,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
