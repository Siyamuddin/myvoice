'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { setUnauthorizedHandler } from '@/lib/api'
import { authApi, userApi } from '@/lib/auth-api'
import { storage, type StoredUser } from '@/lib/storage'
import type { JwtRequest, RegisterData, UserDto } from '@/types'
import { getErrorMessage } from '@/lib/api'
import { isAdmin } from '@/types'

type AuthContextValue = {
  user: StoredUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: JwtRequest) => Promise<void>
  register: (data: RegisterData) => Promise<string>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = storage.getToken()
    if (!token) {
      setUser(null)
      return
    }

    try {
      const me = await userApi.me()
      storage.setUser(me)
      setUser(me)
    } catch {
      const cached = storage.getUser()
      setUser(cached)
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      const token = storage.getToken()
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }
      setUser(storage.getUser())
      await refreshUser()
      setIsLoading(false)
    }

    void bootstrap()
  }, [refreshUser])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      router.push('/login')
    })
    return () => setUnauthorizedHandler(null)
  }, [router])

  const login = useCallback(
    async (credentials: JwtRequest) => {
      const response = await authApi.login(credentials)
      storage.setToken(response.jwtToken)
      storage.setRefreshToken(response.refreshToken)

      let profile: UserDto | StoredUser = {
        email: response.username,
        name: response.username,
      }

      try {
        profile = await userApi.me()
      } catch {
        // profile fetch optional after login
      }

      storage.setUser(profile)
      setUser(profile)
      router.push(isAdmin(profile) ? '/admin/dashboard' : '/voice')
    },
    [router]
  )

  const register = useCallback(async (data: RegisterData) => {
    const response = await authApi.register(data)
    return response.message || 'Account created. You can sign in now.'
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // clear local session regardless
    }
    storage.clear()
    setUser(null)
    router.push('/login')
  }, [router])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export { getErrorMessage }
