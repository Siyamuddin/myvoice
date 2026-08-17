'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { pcmRms } from '@/lib/pcm-wav'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import {
  useVoiceSession,
  type VoiceSessionError,
  type VoiceSessionState,
} from '@/hooks/useVoiceSession'

type TranscriptRole = 'user' | 'assistant'

type TranscriptMessage = {
  role: TranscriptRole
  text: string
}

const ERROR_TOASTS: Record<string, string> = {
  SESSION_LIMIT: 'You already have an active voice session. End it before starting another.',
  RATE_LIMITED: 'Voice rate limit reached. Please wait a moment and try again.',
  VOICE_DISABLED: 'Voice agent is currently disabled.',
  GEMINI_CONNECT_FAILED: 'Could not connect to the AI voice service. Please try again.',
  USAGE_LIMIT: 'Daily free-beta voice minutes used up. Come back tomorrow.',
  SESSION_DURATION_LIMIT: 'This session hit the free-beta time limit. Start a new one.',
  GLOBAL_CAPACITY: 'myvoice is at capacity right now. Try again shortly.',
}

const statusLabel = (state: VoiceSessionState): string => {
  switch (state) {
    case 'connecting':
      return 'Connecting'
    case 'connected':
      return 'Connected'
    case 'reconnecting':
      return 'Reconnecting'
    case 'error':
      return 'Error'
    case 'closed':
      return 'Disconnected'
    default:
      return 'Ready'
  }
}

const statusTone = (state: VoiceSessionState): string => {
  switch (state) {
    case 'connected':
      return 'border-ok/30 bg-ok/10 text-ok'
    case 'reconnecting':
    case 'connecting':
      return 'border-warn/30 bg-warn/10 text-warn'
    case 'error':
      return 'border-danger/30 bg-danger/10 text-danger'
    default:
      return 'border-line bg-foam text-ink-soft'
  }
}

const appendOrReplaceTranscript = (
  prev: TranscriptMessage[],
  role: TranscriptRole,
  text: string
): TranscriptMessage[] => {
  if (!text) {
    return prev
  }
  const last = prev[prev.length - 1]
  if (last?.role === role) {
    return [...prev.slice(0, -1), { role, text }]
  }
  return [...prev, { role, text }]
}

export const VoiceStudio = () => {
  const { state: recorderState, start: startRecording, stop: stopRecording } = useVoiceRecorder()
  const { playChunk, flush: flushPlayer, stop: stopPlayer, ensureContext, isPlaying } = useAudioPlayer()
  const { state: sessionState, rttMs, connect, disconnect, sendAudio, sendAudioStreamEnd } =
    useVoiceSession()

  const [messages, setMessages] = useState<TranscriptMessage[]>([])

  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const deniedToastShownRef = useRef(false)
  const micErrorToastShownRef = useRef(false)
  const agentHoldRef = useRef(false)
  const streamEndSentRef = useRef(false)

  const playChunkRef = useRef(playChunk)
  const flushPlayerRef = useRef(flushPlayer)
  const stopPlayerRef = useRef(stopPlayer)
  const sendAudioRef = useRef(sendAudio)
  const sendAudioStreamEndRef = useRef(sendAudioStreamEnd)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    playChunkRef.current = playChunk
    flushPlayerRef.current = flushPlayer
    stopPlayerRef.current = stopPlayer
    sendAudioRef.current = sendAudio
    sendAudioStreamEndRef.current = sendAudioStreamEnd
    isPlayingRef.current = isPlaying
  }, [playChunk, flushPlayer, stopPlayer, sendAudio, sendAudioStreamEnd, isPlaying])

  const beginAgentHold = useCallback(() => {
    if (!agentHoldRef.current) {
      agentHoldRef.current = true
      if (!streamEndSentRef.current) {
        streamEndSentRef.current = true
        sendAudioStreamEndRef.current()
      }
    }
  }, [])

  const handleUserTranscript = useCallback((text: string) => {
    setMessages((prev) => appendOrReplaceTranscript(prev, 'user', text))
  }, [])

  const handleAssistantTranscript = useCallback((text: string) => {
    setMessages((prev) => appendOrReplaceTranscript(prev, 'assistant', text))
  }, [])

  const handleSessionError = useCallback((error: VoiceSessionError) => {
    const mapped = error.code ? ERROR_TOASTS[error.code] : undefined
    toast.error(mapped ?? error.message)
  }, [])

  const connectSession = useCallback(() => {
    connect({
      onAudio: (pcm) => {
        beginAgentHold()
        playChunkRef.current(pcm)
      },
      onUserTranscript: handleUserTranscript,
      onAssistantTranscript: handleAssistantTranscript,
      onInterrupted: () => {
        // Ignore server barge-in while we are holding the mic closed for playback.
        // Continuous capture otherwise cancels the reply before it is audible.
        if (agentHoldRef.current || isPlayingRef.current()) {
          return
        }
        stopPlayerRef.current()
      },
      onError: handleSessionError,
    })
  }, [connect, handleUserTranscript, handleAssistantTranscript, handleSessionError, beginAgentHold])

  const handleStopRecording = useCallback(() => {
    agentHoldRef.current = false
    streamEndSentRef.current = false
    flushPlayerRef.current()
    stopRecording()
  }, [stopRecording])

  const handleEndSession = useCallback(() => {
    agentHoldRef.current = false
    streamEndSentRef.current = false
    stopRecording()
    stopPlayer()
    disconnect()
  }, [stopRecording, stopPlayer, disconnect])

  const handleRetry = useCallback(() => {
    stopRecording()
    stopPlayer()
    disconnect()
    connectSession()
  }, [stopRecording, stopPlayer, disconnect, connectSession])

  const handleMicToggle = useCallback(async () => {
    if (recorderState === 'recording') {
      handleStopRecording()
      return
    }

    if (sessionState === 'connecting' || sessionState === 'reconnecting') {
      return
    }

    // Unlock speaker playback inside the tap gesture before any await.
    try {
      await ensureContext()
    } catch {
      toast.error('Could not unlock browser audio. Tap again and allow sound.')
      return
    }

    if (sessionState !== 'connected') {
      connectSession()
    }

    await startRecording((pcm) => {
      if (agentHoldRef.current || isPlayingRef.current()) {
        if (pcmRms(pcm) > 0.08) {
          agentHoldRef.current = false
          streamEndSentRef.current = false
          stopPlayerRef.current()
          sendAudioRef.current(pcm)
        }
        return
      }
      sendAudioRef.current(pcm)
    })

    // Re-assert playback unlock after getUserMedia (some mobile browsers re-suspend).
    try {
      await ensureContext()
    } catch {
      // Recording can continue; next audio chunk will try kickPlaybackElement.
    }
  }, [
    recorderState,
    sessionState,
    ensureContext,
    connectSession,
    startRecording,
    handleStopRecording,
  ])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (agentHoldRef.current && !isPlaying()) {
        agentHoldRef.current = false
        streamEndSentRef.current = false
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [isPlaying])

  useEffect(() => {
    if (recorderState === 'recording') {
      deniedToastShownRef.current = false
      micErrorToastShownRef.current = false
      return
    }

    if (recorderState === 'denied') {
      if (!deniedToastShownRef.current) {
        deniedToastShownRef.current = true
        toast.error(
          'Microphone access denied. Allow mic permission in your browser settings and try again.'
        )
      }
      return
    }

    if (recorderState === 'error') {
      if (!micErrorToastShownRef.current) {
        micErrorToastShownRef.current = true
        toast.error('Microphone error. Check your device and try again.')
      }
    }
  }, [recorderState])

  useEffect(() => {
    if (sessionState !== 'error') {
      return
    }
    stopRecording()
  }, [sessionState, stopRecording])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      stopRecording()
      disconnect()
      stopPlayer()
    }
  }, [stopRecording, disconnect, stopPlayer])

  const micDisabled = sessionState === 'connecting' || sessionState === 'reconnecting'
  const showRetry = sessionState === 'error'
  const recordingActive = recorderState === 'recording'
  const sessionActive =
    sessionState === 'connected' ||
    sessionState === 'connecting' ||
    sessionState === 'reconnecting'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 sm:gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="animate-rise">
          <p className="text-sm font-semibold tracking-wide text-teal">Free beta</p>
          <h1 className="mt-1 font-display text-3xl text-ink sm:text-5xl">Talk</h1>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">
            English, Bangla, or Korean — headphones recommended.
          </p>
        </div>
        <div
          className={`inline-flex max-w-full flex-wrap items-center gap-2 self-start rounded-md border px-3 py-2 text-sm font-medium animate-rise-delay ${statusTone(sessionState)}`}
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              sessionState === 'connected'
                ? 'bg-ok'
                : sessionState === 'error'
                  ? 'bg-danger'
                  : sessionState === 'reconnecting' || sessionState === 'connecting'
                    ? 'bg-warn animate-pulse'
                    : 'bg-ink-soft/50'
            }`}
            aria-hidden="true"
          />
          <span>{statusLabel(sessionState)}</span>
          {rttMs != null && sessionState === 'connected' && (
            <span className="opacity-80">RTT {rttMs}ms</span>
          )}
        </div>
      </div>

      <div className="glass-panel animate-rise-delay-2 flex min-h-[min(70dvh,calc(100dvh-14rem))] flex-col rounded-2xl p-4 sm:min-h-0 sm:p-7">
        <div
          className="mb-5 min-h-[10rem] flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-xl bg-white/50 p-3 sm:mb-8 sm:max-h-80 sm:min-h-[14rem] sm:p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          tabIndex={0}
          role="log"
          aria-label="Conversation transcript"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft sm:py-12 sm:text-base">
              Tap the mic and start talking…
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[85%] sm:px-4 ${
                    message.role === 'user'
                      ? 'bg-teal text-white'
                      : 'bg-mist-deep/80 text-ink'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <div className="relative">
            {recordingActive && (
              <span
                className="absolute inset-0 rounded-full bg-teal-bright/30 animate-pulse-ring"
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => {
                void handleMicToggle()
              }}
              disabled={micDisabled}
              aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
              aria-pressed={recordingActive}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-teal text-white shadow-[0_12px_40px_var(--teal-glow)] transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright focus-visible:ring-offset-2 focus-visible:ring-offset-foam disabled:cursor-not-allowed disabled:opacity-50 sm:h-20 sm:w-20 ${
                recordingActive ? 'scale-105' : 'hover:scale-105'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8"
                aria-hidden="true"
              >
                {recordingActive ? (
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                ) : (
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
                )}
              </svg>
            </button>
          </div>

          <div className="flex w-full max-w-xs flex-wrap items-center justify-center gap-3">
            {sessionActive && (
              <button
                type="button"
                onClick={handleEndSession}
                className="min-h-11 flex-1 rounded-md border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger sm:flex-none"
                aria-label="End voice session"
              >
                End
              </button>
            )}
            {showRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-11 flex-1 rounded-md border border-teal/30 bg-teal/5 px-4 py-2.5 text-sm font-medium text-teal transition hover:bg-teal/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:flex-none"
                aria-label="Retry voice connection"
              >
                Retry
              </button>
            )}
          </div>

          <p className="px-2 text-center text-xs text-ink-soft sm:text-sm">
            Use headphones — speaker audio can echo into the mic.
          </p>
        </div>
      </div>
    </div>
  )
}
