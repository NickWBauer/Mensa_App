import { ActiveAboInfo, BookingStatus } from '@/components/logo-header'
import { createContext, useContext } from 'react'

export type AuthData = {
  claims?: Record<string, any> | null
  profile?: any | null
  isLoading: boolean
  isLoggedIn: boolean
  isVerified: boolean
  isAdmin: boolean
  bookingStatus: BookingStatus | null
  activeAbo: ActiveAboInfo
  signIn: (rzKennung: string) => Promise<void>
  signOut: () => Promise<void>
  refetchProfile: () => Promise<void>
  refreshBookingStatus: () => Promise<void>
  refreshActiveAbo: () => Promise<void>
  updateActiveAbo: (info: ActiveAboInfo) => void
}

export const AuthContext = createContext<AuthData>({
  claims: undefined,
  profile: undefined,
  isLoading: true,
  isLoggedIn: false,
  isVerified: false,
  isAdmin: false,
  bookingStatus: null,
  activeAbo: null,
  signIn: async () => {},
  signOut: async () => {},
  refetchProfile: async () => {},
  refreshBookingStatus: async () => {},
  refreshActiveAbo: async () => {},
  updateActiveAbo: () => {},
})

export const useAuthContext = () => useContext(AuthContext)
