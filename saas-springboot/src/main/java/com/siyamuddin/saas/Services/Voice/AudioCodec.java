package com.siyamuddin.saas.Services.Voice;

import java.util.Base64;

/**
 * PCM wire-format helpers for the voice agent (16 kHz input / 24 kHz output).
 */
public final class AudioCodec {

    public static final int INPUT_SAMPLE_RATE = 16000;
    public static final int OUTPUT_SAMPLE_RATE = 24000;

    private AudioCodec() {
    }

    public static String toBase64(byte[] data) {
        if (data == null) {
            throw new IllegalArgumentException("data must not be null");
        }
        return Base64.getEncoder().encodeToString(data);
    }

    public static byte[] fromBase64(String base64) {
        if (base64 == null) {
            throw new IllegalArgumentException("base64 must not be null");
        }
        return Base64.getDecoder().decode(base64);
    }

    /**
     * Number of PCM frames (samples per channel) in a chunk of {@code chunkMs} milliseconds.
     * For mono 16-bit PCM, byte length = {@code chunkFrames * 2}.
     */
    public static int chunkFrames(int sampleRate, int chunkMs) {
        if (chunkMs <= 0) {
            throw new IllegalArgumentException("chunkMs must be > 0");
        }
        if (sampleRate <= 0) {
            throw new IllegalArgumentException("sampleRate must be > 0");
        }
        return sampleRate * chunkMs / 1000;
    }
}
