'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceRecorderState = 'idle' | 'recording' | 'denied' | 'error'

const TARGET_SAMPLE_RATE = 16000
const CHUNK_SAMPLES = 320
const PROCESSOR_BUFFER_SIZE = 4096

export const microphoneSupported = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

const floatToInt16 = (value: number): number => {
  return Math.max(-32768, Math.min(32767, Math.round(value * 32767)))
}

const toMono = (inputBuffer: AudioBuffer): Float32Array => {
  const channelCount = inputBuffer.numberOfChannels
  const length = inputBuffer.length
  if (channelCount === 1) {
    return inputBuffer.getChannelData(0)
  }

  const mono = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let ch = 0; ch < channelCount; ch++) {
      sum += inputBuffer.getChannelData(ch)[i]
    }
    mono[i] = sum / channelCount
  }
  return mono
}

const downsampleLinear = (
  input: Float32Array,
  sourceRate: number,
  targetRate: number,
  leftover: Float32Array
): { output: Float32Array; leftover: Float32Array } => {
  if (sourceRate === targetRate) {
    if (leftover.length === 0) {
      return { output: input, leftover: new Float32Array(0) }
    }
    const merged = new Float32Array(leftover.length + input.length)
    merged.set(leftover)
    merged.set(input, leftover.length)
    return { output: merged, leftover: new Float32Array(0) }
  }

  const merged = new Float32Array(leftover.length + input.length)
  merged.set(leftover)
  merged.set(input, leftover.length)

  const ratio = sourceRate / targetRate
  const outputLength = Math.floor(merged.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const idx = Math.floor(srcIndex)
    const frac = srcIndex - idx
    const s0 = merged[idx] ?? 0
    const s1 = merged[Math.min(idx + 1, merged.length - 1)] ?? s0
    output[i] = s0 + (s1 - s0) * frac
  }

  const consumed = Math.floor(outputLength * ratio)
  return {
    output,
    leftover: merged.slice(consumed),
  }
}

export const useVoiceRecorder = () => {
  const [state, setState] = useState<VoiceRecorderState>('idle')

  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const onChunkRef = useRef<((pcm: Int16Array) => void) | null>(null)
  const leftoverRef = useRef<Float32Array>(new Float32Array(0))
  const pendingSamplesRef = useRef<number[]>([])

  const stop = useCallback(() => {
    const processor = processorRef.current
    if (processor) {
      processor.onaudioprocess = null
      try {
        processor.disconnect()
      } catch {
        // already disconnected
      }
      processorRef.current = null
    }

    const source = sourceRef.current
    if (source) {
      try {
        source.disconnect()
      } catch {
        // already disconnected
      }
      sourceRef.current = null
    }

    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const ctx = audioContextRef.current
    if (ctx) {
      try {
        const closed = ctx.close() as Promise<void> | void
        if (closed && typeof closed.catch === 'function') {
          void closed.catch(() => undefined)
        }
      } catch {
        // context already closed
      }
      audioContextRef.current = null
    }

    leftoverRef.current = new Float32Array(0)
    pendingSamplesRef.current = []
    onChunkRef.current = null
    setState('idle')
  }, [])

  const start = useCallback(
    async (onChunk: (pcm: Int16Array) => void): Promise<void> => {
      if (!microphoneSupported()) {
        setState('error')
        return
      }

      stop()
      onChunkRef.current = onChunk
      leftoverRef.current = new Float32Array(0)
      pendingSamplesRef.current = []

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        streamRef.current = stream

        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioContextCtor()
        audioContextRef.current = ctx

        if (ctx.state === 'suspended') {
          await ctx.resume()
        }

        const source = ctx.createMediaStreamSource(stream)
        sourceRef.current = source

        const processor = ctx.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (event: AudioProcessingEvent) => {
          const mono = toMono(event.inputBuffer)
          const { output, leftover } = downsampleLinear(
            mono,
            ctx.sampleRate,
            TARGET_SAMPLE_RATE,
            leftoverRef.current
          )
          leftoverRef.current = leftover

          const pending = pendingSamplesRef.current
          for (let i = 0; i < output.length; i++) {
            pending.push(floatToInt16(output[i]))
            if (pending.length >= CHUNK_SAMPLES) {
              const chunk = new Int16Array(pending.splice(0, CHUNK_SAMPLES))
              onChunkRef.current?.(chunk)
            }
          }
        }

        source.connect(processor)
        processor.connect(ctx.destination)
        setState('recording')
      } catch (err) {
        stop()
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setState('denied')
        } else {
          setState('error')
        }
      }
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    state,
    start,
    stop,
  }
}
