'use client'

import { useCallback, useRef } from 'react'
import {
  getPlaybackDestination,
  getSharedAudioContext,
  kickPlaybackElement,
  unlockSharedAudioContext,
} from '@/lib/shared-audio-context'

const SOURCE_SAMPLE_RATE = 24000

const int16ToFloat32 = (pcm: Int16Array): Float32Array => {
  const floats = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    floats[i] = pcm[i] / 32768
  }
  return floats
}

const resampleLinear = (
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array => {
  if (fromRate === toRate || input.length === 0) {
    return input
  }

  const ratio = fromRate / toRate
  const outLength = Math.max(1, Math.round(input.length / ratio))
  const output = new Float32Array(outLength)

  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio
    const idx = Math.floor(srcIndex)
    const frac = srcIndex - idx
    const s0 = input[idx] ?? 0
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0
    output[i] = s0 + (s1 - s0) * frac
  }

  return output
}

/**
 * Plays 24 kHz PCM Int16 chunks from Gemini with gap-free scheduling.
 * Output goes to both AudioContext.destination and an HTMLAudioElement sink
 * so speakers keep working while the microphone graph is active.
 */
export const useAudioPlayer = () => {
  const nextStartTimeRef = useRef(0)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const gainRef = useRef<GainNode | null>(null)

  const ensureOutputGain = useCallback((ctx: AudioContext): GainNode => {
    if (!gainRef.current || gainRef.current.context !== ctx) {
      const gain = ctx.createGain()
      gain.gain.value = 1
      const mediaDest = getPlaybackDestination(ctx)
      gain.connect(mediaDest)
      gain.connect(ctx.destination)
      gainRef.current = gain
    }
    return gainRef.current
  }, [])

  const ensureContext = useCallback(async (): Promise<void> => {
    await unlockSharedAudioContext()
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

      let ctx: AudioContext
      try {
        ctx = getSharedAudioContext()
      } catch {
        return
      }

      if (ctx.state === 'suspended') {
        void ctx.resume()
      }
      void kickPlaybackElement()

      const floats = resampleLinear(int16ToFloat32(pcm), SOURCE_SAMPLE_RATE, ctx.sampleRate)
      if (floats.length === 0) {
        return
      }

      const buffer = ctx.createBuffer(1, floats.length, ctx.sampleRate)
      buffer.getChannelData(0).set(floats)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ensureOutputGain(ctx))

      const now = ctx.currentTime
      if (nextStartTimeRef.current && nextStartTimeRef.current < now - 0.05) {
        nextStartTimeRef.current = now
      }
      const startAt = Math.max(now, nextStartTimeRef.current)
      source.start(startAt)
      nextStartTimeRef.current = startAt + buffer.duration

      sourcesRef.current.push(source)
      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((item) => item !== source)
      }
    },
    [ensureOutputGain]
  )

  return {
    playChunk,
    stop,
    isPlaying,
    ensureContext,
  }
}
