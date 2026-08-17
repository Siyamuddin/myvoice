'use client'

import { useCallback, useRef } from 'react'
import { encodePcm16ToWav } from '@/lib/pcm-wav'
import {
  getSpeechAudioElement,
  kickPlaybackElement,
  unlockSharedAudioContext,
} from '@/lib/shared-audio-context'

const SOURCE_SAMPLE_RATE = 24000
const FLUSH_SAMPLES = 2400

const copyPcm = (pcm: Int16Array): Int16Array => {
  const copy = new Int16Array(pcm.length)
  copy.set(pcm)
  return copy
}

const concatPcm = (chunks: Int16Array[]): Int16Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const merged = new Int16Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

/**
 * Plays 24 kHz PCM as queued WAV files on an HTMLAudioElement.
 * This is the path that stays audible during getUserMedia on mobile browsers.
 */
export const useAudioPlayer = () => {
  const pendingRef = useRef<Int16Array[]>([])
  const queueRef = useRef<string[]>([])
  const playingRef = useRef(false)
  const currentUrlRef = useRef<string | null>(null)
  const listenersBoundRef = useRef(false)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const revokeUrl = (url: string | null): void => {
    if (!url) return
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  const bindSpeechElement = useCallback((audio: HTMLAudioElement, playNext: () => void): void => {
    if (listenersBoundRef.current) {
      return
    }
    listenersBoundRef.current = true
    audio.addEventListener('ended', () => {
      revokeUrl(currentUrlRef.current)
      currentUrlRef.current = null
      playingRef.current = false
      playNext()
    })
    audio.addEventListener('error', () => {
      revokeUrl(currentUrlRef.current)
      currentUrlRef.current = null
      playingRef.current = false
      playNext()
    })
  }, [])

  const playNext = useCallback((): void => {
    if (playingRef.current) {
      return
    }
    const nextUrl = queueRef.current.shift()
    if (!nextUrl) {
      return
    }

    const audio = getSpeechAudioElement()
    bindSpeechElement(audio, playNext)
    currentUrlRef.current = nextUrl
    playingRef.current = true
    audio.muted = false
    audio.volume = 1
    audio.src = nextUrl
    void audio.play().catch(() => {
      playingRef.current = false
      revokeUrl(nextUrl)
      currentUrlRef.current = null
      playNext()
    })
  }, [bindSpeechElement])

  const enqueueWav = useCallback(
    (pcm: Int16Array): void => {
      if (pcm.length === 0) {
        return
      }
      const wav = encodePcm16ToWav(pcm, SOURCE_SAMPLE_RATE)
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
      queueRef.current.push(url)
      playNext()
    },
    [playNext]
  )

  const flushPending = useCallback((): void => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    if (pendingRef.current.length === 0) {
      return
    }
    const merged = concatPcm(pendingRef.current)
    pendingRef.current = []
    enqueueWav(merged)
  }, [enqueueWav])

  const ensureContext = useCallback(async (): Promise<void> => {
    await unlockSharedAudioContext()
  }, [])

  const stop = useCallback((): void => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    pendingRef.current = []
    for (const url of queueRef.current) {
      revokeUrl(url)
    }
    queueRef.current = []
    revokeUrl(currentUrlRef.current)
    currentUrlRef.current = null
    playingRef.current = false
    try {
      const audio = getSpeechAudioElement()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    } catch {
      // element may not exist yet
    }
  }, [])

  const isPlaying = useCallback((): boolean => {
    return playingRef.current || queueRef.current.length > 0 || pendingRef.current.length > 0
  }, [])

  const playChunk = useCallback(
    (pcm: Int16Array): void => {
      if (pcm.length === 0) {
        return
      }
      void kickPlaybackElement()
      pendingRef.current.push(copyPcm(pcm))
      const buffered = pendingRef.current.reduce((sum, chunk) => sum + chunk.length, 0)
      if (buffered >= FLUSH_SAMPLES) {
        flushPending()
        return
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
      }
      flushTimerRef.current = setTimeout(() => {
        flushPending()
      }, 80)
    },
    [flushPending]
  )

  return {
    playChunk,
    flush: flushPending,
    stop,
    isPlaying,
    ensureContext,
  }
}
