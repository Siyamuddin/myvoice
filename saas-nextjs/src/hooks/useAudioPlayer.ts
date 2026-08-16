'use client'

import { useCallback, useRef } from 'react'

const PLAYBACK_SAMPLE_RATE = 24000

const int16ToFloat32 = (pcm: Int16Array): Float32Array => {
  const floats = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    floats[i] = pcm[i] / 32768
  }
  return floats
}

export const useAudioPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const nextStartTimeRef = useRef(0)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])

  const ensureContext = useCallback((): void => {
    if (!audioContextRef.current) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextCtor()
    }

    const ctx = audioContextRef.current
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
  }, [])

  const stop = useCallback((): void => {
    for (const source of sourcesRef.current) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
      try {
        source.disconnect()
      } catch {
        // already disconnected
      }
    }
    sourcesRef.current = []
    nextStartTimeRef.current = 0
  }, [])

  const isPlaying = useCallback((): boolean => {
    return sourcesRef.current.length > 0
  }, [])

  const playChunk = useCallback(
    (pcm: Int16Array): void => {
      if (pcm.length === 0) {
        return
      }

      ensureContext()
      const ctx = audioContextRef.current
      if (!ctx) {
        return
      }

      const floats = int16ToFloat32(pcm)
      const buffer = ctx.createBuffer(1, floats.length, PLAYBACK_SAMPLE_RATE)
      buffer.copyToChannel(floats as Float32Array<ArrayBuffer>, 0)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)

      const now = ctx.currentTime
      const startAt = Math.max(now, nextStartTimeRef.current)
      source.start(startAt)
      nextStartTimeRef.current = startAt + buffer.duration

      sourcesRef.current.push(source)

      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((s) => s !== source)
      }
    },
    [ensureContext]
  )

  return {
    playChunk,
    stop,
    isPlaying,
    ensureContext,
  }
}
