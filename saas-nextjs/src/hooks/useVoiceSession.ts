'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getWsBase } from '@/lib/config'
import { storage } from '@/lib/storage'

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed'

export type VoiceSessionError = {
  code?: string
  message: string
}

export type VoiceSessionHandlers = {
  onAudio?: (pcm: Int16Array) => void
  onUserTranscript?: (text: string) => void
  onAssistantTranscript?: (text: string) => void
  onInterrupted?: () => void
  onError?: (error: VoiceSessionError) => void
  onAudioStart?: () => void
  onAudioEnd?: () => void
}

const PING_INTERVAL_MS = 20_000
const BACKOFF_MS = [1000, 2000, 5000] as const
const MAX_RECONNECT_ATTEMPTS = 3

const NO_RECONNECT_CODES = new Set([
  'RATE_LIMITED',
  'SESSION_LIMIT',
  'VOICE_DISABLED',
  'GEMINI_CONNECT_FAILED',
  'USAGE_LIMIT',
  'SESSION_DURATION_LIMIT',
  'GLOBAL_CAPACITY',
])

const buildVoiceWsUrl = (token: string): string => {
  return `${getWsBase()}/ws/voice?token=${encodeURIComponent(token)}`
}

export const useVoiceSession = () => {
  const [state, setState] = useState<VoiceSessionState>('idle')
  const [rttMs, setRttMs] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<VoiceSessionHandlers>({})
  const intentionalCloseRef = useRef(false)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPingAtRef = useRef<number | null>(null)
  const skipReconnectRef = useRef(false)
  const openSocketRef = useRef<() => void>(() => {})

  const clearPingTimer = useCallback(() => {
    if (pingTimerRef.current !== null) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
    lastPingAtRef.current = null
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const startPingTimer = useCallback(
    (ws: WebSocket) => {
      clearPingTimer()
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          return
        }
        lastPingAtRef.current = performance.now()
        ws.send(JSON.stringify({ type: 'ping' }))
      }, PING_INTERVAL_MS)
    },
    [clearPingTimer]
  )

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      handlersRef.current.onAudio?.(new Int16Array(event.data))
      return
    }

    if (event.data instanceof Blob) {
      void event.data.arrayBuffer().then((buf) => {
        handlersRef.current.onAudio?.(new Int16Array(buf))
      })
      return
    }

    if (typeof event.data !== 'string') {
      return
    }

    let frame: Record<string, unknown>
    try {
      frame = JSON.parse(event.data) as Record<string, unknown>
    } catch {
      return
    }

    const type = frame.type
    switch (type) {
      case 'pong': {
        if (lastPingAtRef.current !== null) {
          setRttMs(Math.round(performance.now() - lastPingAtRef.current))
          lastPingAtRef.current = null
        }
        break
      }
      case 'user_transcript': {
        handlersRef.current.onUserTranscript?.(String(frame.text ?? ''))
        break
      }
      case 'assistant_transcript': {
        handlersRef.current.onAssistantTranscript?.(String(frame.text ?? ''))
        break
      }
      case 'interrupted': {
        handlersRef.current.onInterrupted?.()
        break
      }
      case 'audio_start': {
        handlersRef.current.onAudioStart?.()
        break
      }
      case 'audio_end': {
        handlersRef.current.onAudioEnd?.()
        break
      }
      case 'error': {
        const code = typeof frame.code === 'string' ? frame.code : undefined
        const message =
          typeof frame.message === 'string' ? frame.message : 'Voice session error'
        if (code && NO_RECONNECT_CODES.has(code)) {
          skipReconnectRef.current = true
        }
        setState('error')
        handlersRef.current.onError?.({ code, message })
        break
      }
      default:
        break
    }
  }, [])

  const openSocket = useCallback(() => {
    const token = storage.getToken()
    if (!token) {
      setState('error')
      handlersRef.current.onError?.({ message: 'Missing auth token' })
      return
    }

    clearReconnectTimer()
    clearPingTimer()

    const url = buildVoiceWsUrl(token)
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttemptRef.current = 0
      skipReconnectRef.current = false
      setState('connected')
      startPingTimer(ws)
    }

    ws.onmessage = handleMessage

    ws.onerror = () => {
      if (!intentionalCloseRef.current) {
        setState('error')
      }
    }

    ws.onclose = () => {
      clearPingTimer()
      wsRef.current = null

      if (intentionalCloseRef.current) {
        setState('closed')
        return
      }

      if (skipReconnectRef.current) {
        setState('error')
        return
      }

      const attempt = reconnectAttemptRef.current
      if (attempt >= MAX_RECONNECT_ATTEMPTS) {
        setState('error')
        handlersRef.current.onError?.({
          message: 'Voice session reconnect failed after max attempts',
        })
        return
      }

      const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]
      reconnectAttemptRef.current = attempt + 1
      setState('reconnecting')
      reconnectTimerRef.current = setTimeout(() => {
        openSocketRef.current()
      }, delay)
    }
  }, [clearPingTimer, clearReconnectTimer, handleMessage, startPingTimer])

  useEffect(() => {
    openSocketRef.current = openSocket
  }, [openSocket])

  const connect = useCallback(
    (handlers: VoiceSessionHandlers = {}) => {
      handlersRef.current = handlers
      intentionalCloseRef.current = false
      skipReconnectRef.current = false
      reconnectAttemptRef.current = 0
      clearReconnectTimer()

      const existing = wsRef.current
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
      ) {
        return
      }

      setState('connecting')
      openSocket()
    },
    [clearReconnectTimer, openSocket]
  )

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true
    skipReconnectRef.current = false
    clearReconnectTimer()
    clearPingTimer()

    const ws = wsRef.current
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      wsRef.current = null
    }

    setState('closed')
  }, [clearPingTimer, clearReconnectTimer])

  const sendAudio = useCallback((pcm: Int16Array): void => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }
    const buffer =
      pcm.byteOffset === 0 && pcm.byteLength === pcm.buffer.byteLength
        ? pcm.buffer
        : pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)
    ws.send(buffer)
  }, [])

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true
      clearReconnectTimer()
      clearPingTimer()
      const ws = wsRef.current
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
        wsRef.current = null
      }
    }
  }, [clearPingTimer, clearReconnectTimer])

  return {
    state,
    rttMs,
    connect,
    disconnect,
    sendAudio,
  }
}
