import { api } from './api'
import type {
  AllSettings,
  ApiResponse,
  EmailSettings,
  FileStorageSettings,
  OAuthSettings,
  PagedResponse,
  RateLimitSettings,
  SecuritySettings,
  UserDto,
  VoiceSettings,
} from '@/types'

export const adminApi = {
  getUsers: async (
    pageNumber = 0,
    pageSize = 10,
    sortBy = 'id',
    sortDirec = 'asc'
  ): Promise<PagedResponse<UserDto>> => {
    const response = await api.get<PagedResponse<UserDto>>('/admin/', {
      params: { pageNumber, pageSize, sortBy, sortDirec },
    })
    return response.data
  },

  getUser: async (userId: number): Promise<UserDto> => {
    const response = await api.get<UserDto>(`/admin/${userId}`)
    return response.data
  },

  searchUsers: async (keywords: string): Promise<UserDto[]> => {
    const response = await api.get<UserDto[]>(`/admin/search/${encodeURIComponent(keywords)}`)
    return response.data
  },

  updateUser: async (userId: number, data: Partial<UserDto>): Promise<UserDto> => {
    const response = await api.put<UserDto>(`/admin/${userId}`, data)
    return response.data
  },

  deleteUser: async (userId: number): Promise<ApiResponse> => {
    const response = await api.delete<ApiResponse>(`/admin/${userId}`)
    return response.data
  },

  getSettings: async (): Promise<AllSettings> => {
    const response = await api.get<AllSettings>('/admin/settings')
    return response.data
  },

  updateEmail: async (settings: EmailSettings): Promise<EmailSettings> => {
    const response = await api.put<EmailSettings>('/admin/settings/email', settings)
    return response.data
  },

  updateSecurity: async (settings: SecuritySettings): Promise<SecuritySettings> => {
    const response = await api.put<SecuritySettings>('/admin/settings/security', settings)
    return response.data
  },

  updateRateLimits: async (settings: RateLimitSettings): Promise<RateLimitSettings> => {
    const response = await api.put<RateLimitSettings>('/admin/settings/rate-limits', settings)
    return response.data
  },

  updateFileStorage: async (settings: FileStorageSettings): Promise<FileStorageSettings> => {
    const response = await api.put<FileStorageSettings>('/admin/settings/file-storage', settings)
    return response.data
  },

  updateOAuth: async (settings: OAuthSettings): Promise<OAuthSettings> => {
    const response = await api.put<OAuthSettings>('/admin/settings/oauth', settings)
    return response.data
  },

  updateVoice: async (settings: VoiceSettings): Promise<VoiceSettings> => {
    const response = await api.put<VoiceSettings>('/admin/settings/voice', settings)
    return response.data
  },

  testEmail: async (settings: EmailSettings): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/admin/settings/test-email', settings)
    return response.data
  },

  testOAuth: async (settings: OAuthSettings): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/admin/settings/test-oauth', settings)
    return response.data
  },

  resetSettings: async (category: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>(`/admin/settings/reset/${category}`)
    return response.data
  },
}
