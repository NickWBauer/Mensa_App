import { createContext, useContext } from 'react'

export type AuthData = {
  claims?: Record<string, any> | null
  profile?: any | null
  isLoading: boolean
  isLoggedIn: boolean
  isVerified: boolean
  isAdmin: boolean
  signIn: (rzKennung: string) => Promise<void>
  signOut: () => Promise<void>
  refetchProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthData>({
  claims: undefined,
  profile: undefined,
  isLoading: true,
  isLoggedIn: false,
  isVerified: false,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
  refetchProfile: async () => {},
})

export const useAuthContext = () => useContext(AuthContext)
