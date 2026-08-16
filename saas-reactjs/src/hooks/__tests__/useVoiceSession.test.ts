import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceSession } from '../useVoiceSession';

vi.mock('@/utils/storage', () => ({
  storage: {
    getToken: vi.fn(),
  },
}));

vi.mock('@/config/constants', () => ({
  API_CONFIG: {
    baseURL: 'http://localhost:9090',
    timeout: 30000,
    retries: 1,
  },
}));

import { storage } from '@/utils/storage';

type MockSocket = {
  url: string;
  readyState: number;
  binaryType: string;
  sent: unknown[];
  onopen: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

describe('useVoiceSession', () => {
  let sockets: MockSocket[];
  const OriginalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    sockets = [];
    vi.mocked(storage.getToken).mockReturnValue('test-jwt');

    class FakeWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      url: string;
      readyState = FakeWebSocket.CONNECTING;
      binaryType = 'blob';
      sent: unknown[] = [];
      onopen: ((ev: Event) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      onclose: ((ev: CloseEvent) => void) | null = null;
      send = vi.fn((data: unknown) => {
        this.sent.push(data);
      });
      close = vi.fn(() => {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close'));
      });

      constructor(url: string) {
        this.url = url;
        sockets.push(this as unknown as MockSocket);
      }
    }

    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    globalThis.WebSocket = OriginalWebSocket;
    vi.clearAllMocks();
  });

  const openLatest = () => {
    const ws = sockets[sockets.length - 1];
    ws.readyState = WebSocket.OPEN;
    act(() => {
      ws.onopen?.(new Event('open'));
    });
    return ws;
  };

  it('connect() opens WebSocket with token from storage', () => {
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect();
    });

    expect(result.current.state).toBe('connecting');
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toBe('ws://localhost:9090/ws/voice?token=test-jwt');
    expect(sockets[0].binaryType).toBe('arraybuffer');

    openLatest();
    expect(result.current.state).toBe('connected');
  });

  it('sets error when no token is available', () => {
    vi.mocked(storage.getToken).mockReturnValue(null);
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect({ onError });
    });

    expect(result.current.state).toBe('error');
    expect(onError).toHaveBeenCalledWith({ message: 'Missing auth token' });
    expect(sockets).toHaveLength(0);
  });

  it('dispatches binary audio and JSON transcript frames', () => {
    const onAudio = vi.fn();
    const onUserTranscript = vi.fn();
    const onAssistantTranscript = vi.fn();
    const onInterrupted = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect({
        onAudio,
        onUserTranscript,
        onAssistantTranscript,
        onInterrupted,
        onError,
      });
    });

    const ws = openLatest();

    const pcm = new Int16Array([1, 2, 3, 4]);
    act(() => {
      ws.onmessage?.(
        new MessageEvent('message', {
          data: pcm.buffer,
        })
      );
    });

    expect(onAudio).toHaveBeenCalledTimes(1);
    const received = onAudio.mock.calls[0][0] as Int16Array;
    expect(received).toBeInstanceOf(Int16Array);
    expect(Array.from(received)).toEqual([1, 2, 3, 4]);

    act(() => {
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'user_transcript', text: 'hello' }),
        })
      );
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'assistant_transcript', text: 'hi' }),
        })
      );
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'interrupted' }),
        })
      );
    });

    expect(onUserTranscript).toHaveBeenCalledWith('hello');
    expect(onAssistantTranscript).toHaveBeenCalledWith('hi');
    expect(onInterrupted).toHaveBeenCalled();
  });

  it('sends ping every 20s and records rtt on pong', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect();
    });
    const ws = openLatest();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));

    act(() => {
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'pong' }),
        })
      );
    });

    expect(result.current.rttMs).not.toBeNull();
    expect(typeof result.current.rttMs).toBe('number');
  });

  it('SESSION_LIMIT error sets state error and does not reconnect', () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect({ onError });
    });
    const ws = openLatest();

    act(() => {
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'error',
            code: 'SESSION_LIMIT',
            message: 'Too many sessions',
          }),
        })
      );
    });

    expect(result.current.state).toBe('error');
    expect(onError).toHaveBeenCalledWith({
      code: 'SESSION_LIMIT',
      message: 'Too many sessions',
    });

    const socketsBeforeClose = sockets.length;

    act(() => {
      ws.readyState = WebSocket.CLOSED;
      ws.onclose?.(new CloseEvent('close'));
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(sockets).toHaveLength(socketsBeforeClose);
    expect(result.current.state).toBe('error');
  });

  it('unexpected close reconnects with exponential backoff', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect();
    });
    const first = openLatest();

    act(() => {
      first.readyState = WebSocket.CLOSED;
      first.onclose?.(new CloseEvent('close'));
    });

    expect(result.current.state).toBe('reconnecting');
    expect(sockets).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(sockets).toHaveLength(2);

    openLatest();

    act(() => {
      sockets[1].readyState = WebSocket.CLOSED;
      sockets[1].onclose?.(new CloseEvent('close'));
    });

    expect(result.current.state).toBe('reconnecting');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(sockets).toHaveLength(3);
  });

  it('sendAudio sends ArrayBuffer when connected', () => {
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect();
    });
    const ws = openLatest();

    const pcm = new Int16Array([9, 8, 7]);
    act(() => {
      result.current.sendAudio(pcm);
    });

    expect(ws.send).toHaveBeenCalled();
    const sent = ws.send.mock.calls[0][0];
    expect(sent).toBeInstanceOf(ArrayBuffer);
  });

  it('disconnect closes cleanly without reconnect', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVoiceSession());

    act(() => {
      result.current.connect();
    });
    openLatest();

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.state).toBe('closed');

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(sockets).toHaveLength(1);
  });
});
