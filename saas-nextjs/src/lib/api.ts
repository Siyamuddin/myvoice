import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { getApiBase } from './config'
import { storage } from './storage'

export const api = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let onUnauthorized: (() => void) | null = null

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = storage.getRefreshToken()

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${getApiBase()}/auth/refresh-token`,
            null,
            { params: { refreshToken } }
          )
          const { jwtToken } = response.data as { jwtToken: string }
          storage.setToken(jwtToken)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${jwtToken}`
          }
          return api(originalRequest as AxiosRequestConfig)
        } catch (refreshError) {
          storage.clear()
          onUnauthorized?.()
          return Promise.reject(refreshError)
        }
      }

      storage.clear()
      onUnauthorized?.()
    }

    return Promise.reject(error)
  }
)

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    return data?.message || data?.error || error.message || fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
