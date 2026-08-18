package com.siyamuddin.saas.Services.Voice;

/**
 * Callbacks for events from a Gemini Live WebSocket session.
 * <p>
 * Implementations must be concurrency-safe: callbacks may arrive on
 * WebSocket listener threads concurrently with send/close on other threads.
 */
public interface VoiceListener {

    void onAudio(byte[] pcm24k);

    void onUserTranscript(String text);

    void onAssistantTranscript(String text);

    void onInterrupted();

    default void onTurnComplete() {
    }

    void onError(Throwable t);

    void onClose();
}
