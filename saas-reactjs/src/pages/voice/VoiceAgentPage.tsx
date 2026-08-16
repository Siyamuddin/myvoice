import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  useVoiceSession,
  type VoiceSessionError,
  type VoiceSessionState,
} from '@/hooks/useVoiceSession';

type TranscriptRole = 'user' | 'assistant';

type TranscriptMessage = {
  role: TranscriptRole;
  text: string;
};

/**
 * Mic toggles recording only; the WebSocket session stays open until End or unmount.
 */
const ERROR_TOASTS: Record<string, string> = {
  SESSION_LIMIT: 'You already have an active voice session. End it before starting another.',
  RATE_LIMITED: 'Voice rate limit reached. Please wait a moment and try again.',
  VOICE_DISABLED: 'Voice agent is currently disabled.',
  GEMINI_CONNECT_FAILED: 'Could not connect to the AI voice service. Please try again.',
};

const statusLabel = (state: VoiceSessionState): string => {
  switch (state) {
    case 'connecting':
      return 'Connecting';
    case 'connected':
      return 'Connected';
    case 'reconnecting':
      return 'Reconnecting';
    case 'error':
      return 'Error';
    case 'closed':
      return 'Disconnected';
    default:
      return 'Idle';
  }
};

const statusPillClass = (state: VoiceSessionState): string => {
  switch (state) {
    case 'connected':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'reconnecting':
    case 'connecting':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'error':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    default:
      return 'bg-slate-500/20 text-gray-300 border-slate-500/40';
  }
};

const appendOrReplaceTranscript = (
  prev: TranscriptMessage[],
  role: TranscriptRole,
  text: string
): TranscriptMessage[] => {
  if (!text) {
    return prev;
  }
  const last = prev[prev.length - 1];
  if (last?.role === role) {
    return [...prev.slice(0, -1), { role, text }];
  }
  return [...prev, { role, text }];
};

export const VoiceAgentPage = () => {
  const { state: recorderState, start: startRecording, stop: stopRecording } = useVoiceRecorder();
  const { playChunk, stop: stopPlayer, ensureContext } = useAudioPlayer();
  const { state: sessionState, rttMs, connect, disconnect, sendAudio } = useVoiceSession();

  const [messages, setMessages] = useState<TranscriptMessage[]>([]);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const deniedToastShownRef = useRef(false);
  const micErrorToastShownRef = useRef(false);

  const playChunkRef = useRef(playChunk);
  const stopPlayerRef = useRef(stopPlayer);
  const sendAudioRef = useRef(sendAudio);

  useEffect(() => {
    playChunkRef.current = playChunk;
    stopPlayerRef.current = stopPlayer;
    sendAudioRef.current = sendAudio;
  }, [playChunk, stopPlayer, sendAudio]);

  const handleUserTranscript = useCallback((text: string) => {
    setMessages((prev) => appendOrReplaceTranscript(prev, 'user', text));
  }, []);

  const handleAssistantTranscript = useCallback((text: string) => {
    setMessages((prev) => appendOrReplaceTranscript(prev, 'assistant', text));
  }, []);

  const handleSessionError = useCallback((error: VoiceSessionError) => {
    const mapped = error.code ? ERROR_TOASTS[error.code] : undefined;
    toast.error(mapped ?? error.message);
  }, []);

  const connectSession = useCallback(() => {
    connect({
      onAudio: (pcm) => playChunkRef.current(pcm),
      onUserTranscript: handleUserTranscript,
      onAssistantTranscript: handleAssistantTranscript,
      onInterrupted: () => stopPlayerRef.current(),
      onError: handleSessionError,
    });
  }, [connect, handleUserTranscript, handleAssistantTranscript, handleSessionError]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleEndSession = useCallback(() => {
    stopRecording();
    stopPlayer();
    disconnect();
  }, [stopRecording, stopPlayer, disconnect]);

  const handleRetry = useCallback(() => {
    stopRecording();
    stopPlayer();
    disconnect();
    connectSession();
  }, [stopRecording, stopPlayer, disconnect, connectSession]);

  const handleMicToggle = useCallback(async () => {
    if (recorderState === 'recording') {
      handleStopRecording();
      return;
    }

    if (sessionState === 'connecting' || sessionState === 'reconnecting') {
      return;
    }

    ensureContext();

    if (sessionState !== 'connected') {
      connectSession();
    }

    await startRecording((pcm) => sendAudioRef.current(pcm));
  }, [
    recorderState,
    sessionState,
    ensureContext,
    connectSession,
    startRecording,
    handleStopRecording,
  ]);

  useEffect(() => {
    if (recorderState === 'recording') {
      deniedToastShownRef.current = false;
      micErrorToastShownRef.current = false;
      return;
    }

    if (recorderState === 'denied') {
      if (!deniedToastShownRef.current) {
        deniedToastShownRef.current = true;
        toast.error(
          'Microphone access denied. Allow mic permission in your browser settings and try again.'
        );
      }
      return;
    }

    if (recorderState === 'error') {
      if (!micErrorToastShownRef.current) {
        micErrorToastShownRef.current = true;
        toast.error('Microphone error. Check your device and try again.');
      }
    }
  }, [recorderState]);

  useEffect(() => {
    if (sessionState !== 'error') {
      return;
    }
    stopRecording();
  }, [sessionState, stopRecording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
      stopPlayer();
    };
  }, [stopRecording, disconnect, stopPlayer]);

  const micDisabled = sessionState === 'connecting' || sessionState === 'reconnecting';
  const showRetry = sessionState === 'error';
  const recordingActive = recorderState === 'recording';
  const sessionActive =
    sessionState === 'connected' ||
    sessionState === 'connecting' ||
    sessionState === 'reconnecting';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Voice Agent</h1>
          <p className="mt-2 text-gray-300">
            Talk to your AI assistant in English, Bangla, or Korean
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-medium ${statusPillClass(sessionState)}`}
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              sessionState === 'connected'
                ? 'bg-emerald-400'
                : sessionState === 'error'
                  ? 'bg-red-400'
                  : sessionState === 'reconnecting' || sessionState === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-gray-400'
            }`}
            aria-hidden="true"
          />
          <span>{statusLabel(sessionState)}</span>
          {rttMs != null && sessionState === 'connected' && (
            <span className="text-emerald-200/80">RTT {rttMs}ms</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-slate-800/50 p-6 shadow-xl backdrop-blur-sm">
        <div
          className="mb-6 max-h-80 min-h-[12rem] space-y-3 overflow-y-auto rounded-lg border border-blue-500/10 bg-slate-900/40 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          tabIndex={0}
          role="log"
          aria-label="Conversation transcript"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="py-10 text-center text-gray-400">Tap the mic and start talking…</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-600/80 text-white'
                      : 'bg-slate-700/80 text-gray-100'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => {
              void handleMicToggle();
            }}
            disabled={micDisabled}
            aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
            aria-pressed={recordingActive}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
              recordingActive ? 'animate-pulse scale-105' : 'hover:scale-105'
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

          <div className="flex flex-wrap items-center justify-center gap-3">
            {sessionActive && (
              <button
                type="button"
                onClick={handleEndSession}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="End voice session"
              >
                End
              </button>
            )}
            {showRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Retry voice connection"
              >
                Retry
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-400">
            🎧 Use headphones — speaker audio can echo into the mic.
          </p>
        </div>
      </div>
    </div>
  );
};
