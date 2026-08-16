export const APP_NAME = 'myvoice'

export const APP_DESCRIPTION =
  'Low-latency conversational voice agent. Talk naturally in English, Bangla, or Korean.'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || ''

export const getApiBase = (): string => {
  if (API_BASE_URL) {
    return `${API_BASE_URL}/api/v1`
  }
  return '/api/v1'
}

export const getWsBase = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }

  if (API_BASE_URL) {
    return API_BASE_URL.replace(/^http/, 'ws')
  }

  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}`
}
