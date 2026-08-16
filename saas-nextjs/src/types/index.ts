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

export type PagedResponse<T> = {
  content: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
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

export type EmailSettings = {
  host: string
  port: number
  username: string
  password: string
  from: string
  fromName: string
  enabled: boolean
  verificationBaseUrl: string
  passwordResetBaseUrl: string
  smtpAuth: boolean
  smtpTls: boolean
}

export type SecuritySettings = {
  maxFailedLoginAttempts: number
  accountLockoutDuration: number
  passwordMinLength: number
  passwordMaxLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireDigit: boolean
  passwordRequireSpecialChar: boolean
  sessionTimeout: number
  requireEmailVerification: boolean
  emailVerificationTokenExpiry: number
  passwordResetTokenExpiry: number
}

export type RateLimitSettings = {
  loginRequests: number
  loginDuration: number
  registrationRequests: number
  registrationDuration: number
  passwordChangeRequests: number
  passwordChangeDuration: number
  generalRequests: number
  generalDuration: number
}

export type FileStorageSettings = {
  mode: 'local' | 's3'
  maxFileSize: number
  allowedImageTypes: string
  localBasePath: string
  localPublicPrefix: string
  s3BucketName: string
  s3Region: string
  s3AccessKey: string
  s3SecretKey: string
  s3PublicBaseUrl: string
  cleanupEnabled: boolean
}

export type OAuthSettings = {
  enabled: boolean
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizedDomains: string
  scopes: string
}

export type VoiceSettings = {
  geminiApiKey: string
  geminiModel: string
  systemPrompt: string
  maxSessionsPerUser: number
  maxSessionDurationSeconds: number
  maxDailyMinutesPerUser: number
  maxGlobalSessions: number
}

export type AllSettings = {
  email: EmailSettings
  security: SecuritySettings
  rateLimits: RateLimitSettings
  fileStorage: FileStorageSettings
  oauth: OAuthSettings
  voice: VoiceSettings
}

export const isAdmin = (user: { roles?: Role[] } | null | undefined): boolean => {
  return Boolean(user?.roles?.some((role) => role.name === 'ROLE_ADMIN'))
}
