import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioPlayer } from '../useAudioPlayer'
import { encodePcm16ToWav } from '@/lib/pcm-wav'
import { __resetSharedAudioContextForTests } from '@/lib/shared-audio-context'

describe('encodePcm16ToWav', () => {
  it('writes a valid PCM WAV header', () => {
    const pcm = new Int16Array([0, 32767, -32768, 123])
    const wav = encodePcm16ToWav(pcm, 24000)
    const view = new DataView(wav)
    const ascii = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(wav, offset, length))

    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(24000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(pcm.byteLength)
    expect(wav.byteLength).toBe(44 + pcm.byteLength)
  })
})

describe('useAudioPlayer', () => {
  let fakeContext: {
    currentTime: number
    state: string
    sampleRate: number
    destination: object
    resume: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }
  let createdAudio: Array<{
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    load: ReturnType<typeof vi.fn>
    src: string
  }>

  beforeEach(() => {
    __resetSharedAudioContextForTests()
    createdAudio = []
    fakeContext = {
      currentTime: 0,
      state: 'running',
      sampleRate: 48000,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }

    class FakeAudio {
      autoplay = false
      controls = false
      preload = ''
      muted = false
      volume = 1
      paused = true
      loop = false
      playsInline = false
      src = ''
      srcObject: MediaStream | null = null
      style: Record<string, string> = {}
      setAttribute = vi.fn()
      addEventListener = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn().mockImplementation(() => {
        this.paused = false
        return Promise.resolve()
      })
      pause = vi.fn().mockImplementation(() => {
        this.paused = true
      })
      load = vi.fn()
      remove = vi.fn()
    }

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContext() {
        return fakeContext
      }) as unknown as typeof AudioContext
    )
    vi.stubGlobal('HTMLAudioElement', FakeAudio)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:wav'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'audio') {
        const audio = new FakeAudio()
        createdAudio.push(audio)
        return audio as unknown as HTMLElement
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

  it('queues WAV playback from PCM chunks', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAudioPlayer())

    act(() => {
      result.current.playChunk(new Int16Array(2400))
    })

    expect(result.current.isPlaying()).toBe(true)
    expect(createdAudio.some((audio) => audio.play.mock.calls.length > 0)).toBe(true)

    act(() => {
      result.current.stop()
    })
    expect(result.current.isPlaying()).toBe(false)
    vi.useRealTimers()
  })

  it('ensureContext resumes AudioContext', async () => {
    fakeContext.state = 'suspended'
    const { result } = renderHook(() => useAudioPlayer())

    await act(async () => {
      await result.current.ensureContext()
    })

    expect(AudioContext).toHaveBeenCalled()
    expect(fakeContext.resume).toHaveBeenCalled()
  })
})
