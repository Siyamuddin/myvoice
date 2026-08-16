import { api } from './api'
import type { ApiResponse, JwtRequest, JwtResponse, RegisterData, UserDto, UserSession } from '@/types'

export const authApi = {
  login: async (credentials: JwtRequest): Promise<JwtResponse> => {
    const response = await api.post<JwtResponse>('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/register', data)
    return response.data
  },

  verifyEmail: async (token: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/verify-email', null, {
      params: { token },
    })
    return response.data
  },

  resendVerification: async (email: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/resend-verification', null, {
      params: { email },
    })
    return response.data
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/forgot-password', null, {
      params: { email },
    })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/reset-password', null, {
      params: { token, newPassword },
    })
    return response.data
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/logout')
    return response.data
  },
}

export const userApi = {
  me: async (): Promise<UserDto> => {
    const response = await api.get<UserDto>('/users/me')
    return response.data
  },

  updateMe: async (data: Partial<UserDto>): Promise<UserDto> => {
    const response = await api.put<UserDto>('/users/me', data)
    return response.data
  },

  changePassword: async (payload: {
    currentPassword: string
    newPassword: string
  }): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/users/me/change-password', null, {
      params: payload,
    })
    return response.data
  },

  sessions: async (): Promise<UserSession[]> => {
    const response = await api.get<UserSession[]>('/users/me/sessions')
    return response.data
  },

  revokeSession: async (sessionId: string): Promise<ApiResponse> => {
    const response = await api.delete<ApiResponse>(`/users/me/sessions/${sessionId}`)
    return response.data
  },
}
