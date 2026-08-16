const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

export type StoredUser = {
  id?: number
  name?: string
  email?: string
  roles?: Array<{ id: number; name: string }>
  profileImageUrl?: string
  about?: string
}

const canUseStorage = (): boolean => typeof window !== 'undefined'

export const storage = {
  getToken: (): string | null => {
    if (!canUseStorage()) return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  setToken: (token: string): void => {
    if (!canUseStorage()) return
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  getRefreshToken: (): string | null => {
    if (!canUseStorage()) return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setRefreshToken: (token: string): void => {
    if (!canUseStorage()) return
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },

  getUser: (): StoredUser | null => {
    if (!canUseStorage()) return null
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredUser
    } catch {
      return null
    }
  },

  setUser: (user: StoredUser): void => {
    if (!canUseStorage()) return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  clear: (): void => {
    if (!canUseStorage()) return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}
