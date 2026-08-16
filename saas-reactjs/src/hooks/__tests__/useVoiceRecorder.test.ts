import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder, microphoneSupported } from '../useVoiceRecorder';

type FakeProcessor = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  onaudioprocess: ((event: AudioProcessingEvent) => void) | null;
};

type FakeSource = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

describe('useVoiceRecorder', () => {
  let fakeTrack: { stop: ReturnType<typeof vi.fn>; getSettings: () => Record<string, never> };
  let fakeStream: MediaStream;
  let fakeProcessor: FakeProcessor;
  let fakeSource: FakeSource;
  let fakeContext: {
    sampleRate: number;
    state: string;
    destination: object;
    resume: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    createMediaStreamSource: ReturnType<typeof vi.fn>;
    createScriptProcessor: ReturnType<typeof vi.fn>;
  };
  let getUserMediaMock: ReturnType<typeof vi.fn>;

  const triggerProcess = (samples: Float32Array) => {
    const event = {
      inputBuffer: {
        numberOfChannels: 1,
        length: samples.length,
        sampleRate: fakeContext.sampleRate,
        getChannelData: (channel: number) => {
          if (channel !== 0) {
            throw new Error(`unexpected channel ${channel}`);
          }
          return samples;
        },
      },
    } as unknown as AudioProcessingEvent;

    fakeProcessor.onaudioprocess?.(event);
  };

  beforeEach(() => {
    fakeTrack = {
      stop: vi.fn(),
      getSettings: () => ({}),
    };
    fakeStream = {
      getTracks: () => [fakeTrack],
    } as unknown as MediaStream;

    fakeProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null,
    };

    fakeSource = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    fakeContext = {
      sampleRate: 16000,
      state: 'running',
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createMediaStreamSource: vi.fn().mockReturnValue(fakeSource),
      createScriptProcessor: vi.fn().mockReturnValue(fakeProcessor),
    };

    getUserMediaMock = vi.fn().mockResolvedValue(fakeStream);

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: getUserMediaMock,
      },
    });

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContext() {
        return fakeContext;
      }) as unknown as typeof AudioContext
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes microphoneSupported helper', () => {
    expect(microphoneSupported()).toBe(true);
  });

  it('start() sets recording and wires audio graph', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    const onChunk = vi.fn();

    await act(async () => {
      await result.current.start(onChunk);
    });

    expect(result.current.state).toBe('recording');
    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(fakeContext.createMediaStreamSource).toHaveBeenCalledWith(fakeStream);
    expect(fakeContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
    expect(fakeSource.connect).toHaveBeenCalledWith(fakeProcessor);
    expect(fakeProcessor.connect).toHaveBeenCalledWith(fakeContext.destination);
  });

  it('emits Int16Array chunks of 320 samples and clamps values', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    const chunks: Int16Array[] = [];

    await act(async () => {
      await result.current.start((pcm) => {
        chunks.push(pcm);
      });
    });

    const samples = new Float32Array(640);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = i % 2 === 0 ? 2 : -2;
    }

    act(() => {
      triggerProcess(samples);
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBeInstanceOf(Int16Array);
    expect(chunks[0].length).toBe(320);
    expect(chunks[1].length).toBe(320);
    expect(chunks[0][0]).toBe(32767);
    expect(chunks[0][1]).toBe(-32768);
  });

  it('stop() stops tracks and resets state', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start(vi.fn());
    });
    expect(result.current.state).toBe('recording');

    act(() => {
      result.current.stop();
    });

    expect(fakeTrack.stop).toHaveBeenCalled();
    expect(fakeProcessor.disconnect).toHaveBeenCalled();
    expect(fakeSource.disconnect).toHaveBeenCalled();
    expect(fakeContext.close).toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('sets state to denied when getUserMedia rejects with NotAllowedError', async () => {
    getUserMediaMock.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start(vi.fn());
    });

    expect(result.current.state).toBe('denied');
  });
});
