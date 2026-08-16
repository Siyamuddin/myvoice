import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioPlayer } from '../useAudioPlayer'
import { __resetSharedAudioContextForTests } from '@/lib/shared-audio-context'

describe('useAudioPlayer', () => {
  let currentTime: number
  let createdSources: Array<{
    connect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    buffer: AudioBuffer | null
    onended: ((ev: Event) => void) | null
  }>
  let fakeContext: {
    currentTime: number
    state: string
    sampleRate: number
    destination: object
    resume: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    createBuffer: ReturnType<typeof vi.fn>
    createBufferSource: ReturnType<typeof vi.fn>
    createGain: ReturnType<typeof vi.fn>
    createMediaStreamDestination: ReturnType<typeof vi.fn>
  }
  let mediaDest: { stream: MediaStream; context: unknown; connect?: unknown }

  beforeEach(() => {
    __resetSharedAudioContextForTests()
    currentTime = 10
    createdSources = []

    mediaDest = {
      stream: { id: 'fake-stream' } as unknown as MediaStream,
      context: null,
    }

    fakeContext = {
      get currentTime() {
        return currentTime
      },
      state: 'running',
      sampleRate: 24000,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn(),
      createMediaStreamDestination: vi.fn(() => {
        mediaDest.context = fakeContext
        return mediaDest
      }),
      createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
        const channelData = new Float32Array(length)
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          copyToChannel: (src: Float32Array, channel: number) => {
            if (channel === 0) {
              channelData.set(src)
            }
          },
          getChannelData: () => channelData,
        }
      }),
      createBufferSource: vi.fn(() => {
        const source = {
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
          buffer: null as AudioBuffer | null,
          onended: null as ((ev: Event) => void) | null,
        }
        createdSources.push(source)
        return source
      }),
    }

    fakeContext.createGain = vi.fn(() => ({
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      context: fakeContext as unknown as AudioContext,
    }))

    class FakeAudio {
      autoplay = false
      controls = false
      preload = ''
      muted = false
      volume = 1
      paused = false
      srcObject: MediaStream | null = null
      style: Record<string, string> = {}
      setAttribute = vi.fn()
      play = vi.fn().mockResolvedValue(undefined)
      pause = vi.fn()
      remove = vi.fn()
    }

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContext() {
        return fakeContext
      }) as unknown as typeof AudioContext
    )
    vi.stubGlobal('HTMLAudioElement', FakeAudio)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'audio') {
        return new FakeAudio() as unknown as HTMLElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
    }) as typeof document.createElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
  })

  afterEach(() => {
    __resetSharedAudioContextForTests()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('schedules chunks gap-free from currentTime', () => {
    const { result } = renderHook(() => useAudioPlayer())

    const chunkA = new Int16Array(240)
    const chunkB = new Int16Array(480)

    act(() => {
      result.current.playChunk(chunkA)
      result.current.playChunk(chunkB)
    })

    expect(createdSources).toHaveLength(2)
    expect(createdSources[0].start).toHaveBeenCalledWith(10)
    expect(createdSources[1].start).toHaveBeenCalledWith(10.01)
    expect(result.current.isPlaying()).toBe(true)
  })

  it('stop() stops all scheduled sources and clears playing state', () => {
    const { result } = renderHook(() => useAudioPlayer())

    act(() => {
      result.current.playChunk(new Int16Array(240))
      result.current.playChunk(new Int16Array(240))
    })

    expect(result.current.isPlaying()).toBe(true)

    act(() => {
      result.current.stop()
    })

    expect(createdSources[0].stop).toHaveBeenCalled()
    expect(createdSources[1].stop).toHaveBeenCalled()
    expect(result.current.isPlaying()).toBe(false)
  })

  it('ensureContext unlocks a suspended AudioContext and plays the audio element', async () => {
    fakeContext.state = 'suspended'
    const { result } = renderHook(() => useAudioPlayer())

    await act(async () => {
      await result.current.ensureContext()
    })

    expect(AudioContext).toHaveBeenCalled()
    expect(fakeContext.resume).toHaveBeenCalled()
    expect(fakeContext.createMediaStreamDestination).toHaveBeenCalled()
  })

  it('resamples 24kHz PCM when context sample rate differs', () => {
    fakeContext.sampleRate = 48000
    const { result } = renderHook(() => useAudioPlayer())

    act(() => {
      result.current.playChunk(new Int16Array(240))
    })

    expect(fakeContext.createBuffer).toHaveBeenCalledWith(1, 480, 48000)
    expect(createdSources[0].start).toHaveBeenCalledWith(10)
  })
})
