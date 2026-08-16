package com.siyamuddin.saas.Services.Voice;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AudioCodecTest {

    @Test
    void base64RoundTripIncludingEmptyAndBinarySafe() {
        byte[] empty = new byte[0];
        assertThat(AudioCodec.fromBase64(AudioCodec.toBase64(empty))).isEqualTo(empty);

        byte[] binary = new byte[256];
        for (int i = 0; i < binary.length; i++) {
            binary[i] = (byte) i;
        }
        assertThat(AudioCodec.fromBase64(AudioCodec.toBase64(binary))).isEqualTo(binary);
    }

    @Test
    void chunkFramesFor16kAnd24k() {
        assertThat(AudioCodec.chunkFrames(AudioCodec.INPUT_SAMPLE_RATE, 20)).isEqualTo(320);
        assertThat(AudioCodec.chunkFrames(AudioCodec.OUTPUT_SAMPLE_RATE, 20)).isEqualTo(480);
        assertThat(AudioCodec.chunkFrames(16000, 10)).isEqualTo(160);
        assertThat(AudioCodec.INPUT_SAMPLE_RATE).isEqualTo(16000);
        assertThat(AudioCodec.OUTPUT_SAMPLE_RATE).isEqualTo(24000);
    }

    @Test
    void chunkFramesRejectsInvalidChunkMs() {
        assertThatThrownBy(() -> AudioCodec.chunkFrames(16000, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AudioCodec.chunkFrames(16000, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void base64RejectsNull() {
        assertThatThrownBy(() -> AudioCodec.toBase64(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AudioCodec.fromBase64(null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
