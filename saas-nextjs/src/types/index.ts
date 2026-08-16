export type Role = {
  id: number
  name: string
}

export type UserDto = {
  id: number
  name: string
  email: string
  password?: string
  about?: string
  roles?: Role[]
  profileImageUrl?: string
}

export type JwtRequest = {
  email: string
  password: string
}

export type JwtResponse = {
  jwtToken: string
  refreshToken: string
  username: string
  tokenType?: string
}

export type RegisterData = {
  name: string
  email: string
  password: string
  about?: string
}

export type ApiResponse = {
  message?: string
  success?: boolean
}

export type UserSession = {
  id: number
  sessionId: string
  ipAddress?: string
  userAgent?: string
  loginTime: string
  lastActivity?: string
  expiresAt: string
  isActive: boolean
}

export const isAdmin = (user: { roles?: Role[] } | null | undefined): boolean => {
  return Boolean(user?.roles?.some((role) => role.name === 'ROLE_ADMIN'))
}
