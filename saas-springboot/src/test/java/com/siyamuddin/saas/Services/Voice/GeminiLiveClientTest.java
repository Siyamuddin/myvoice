package com.siyamuddin.saas.Services.Voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiLiveClientTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void buildSetupMessageContainsRequiredFields() throws Exception {
        String json = GeminiLiveClient.buildSetupMessage(
                "gemini-live-2.5-flash-native-audio",
                "You are a helpful AI assistant.");

        JsonNode root = MAPPER.readTree(json);
        JsonNode setup = root.get("setup");

        assertThat(setup.get("model").asText())
                .isEqualTo("models/gemini-live-2.5-flash-native-audio");
        assertThat(setup.get("generationConfig").get("responseModalities").get(0).asText())
                .isEqualTo("AUDIO");
        assertThat(setup.get("generationConfig")
                        .get("speechConfig")
                        .get("voiceConfig")
                        .get("prebuiltVoiceConfig")
                        .get("voiceName")
                        .asText())
                .isEqualTo("Kore");
        assertThat(setup.get("realtimeInputConfig").get("automaticActivityDetection").isObject())
                .isTrue();
        assertThat(setup.get("systemInstruction").get("parts").get(0).get("text").asText())
                .isEqualTo("You are a helpful AI assistant.");
        assertThat(setup.get("inputAudioTranscription").isObject()).isTrue();
        assertThat(setup.get("outputAudioTranscription").isObject()).isTrue();
    }

    @Test
    void buildRealtimeAudioMessageContainsMimeTypeAndBase64() throws Exception {
        byte[] pcm = new byte[] {0x01, 0x02, (byte) 0xFE, (byte) 0xFF};
        String base64 = Base64.getEncoder().encodeToString(pcm);

        String json = GeminiLiveClient.buildRealtimeAudioMessage(base64);
        JsonNode audio = MAPPER.readTree(json).get("realtimeInput").get("audio");

        assertThat(audio.get("mimeType").asText()).isEqualTo("audio/pcm;rate=16000");
        assertThat(audio.get("data").asText()).isEqualTo(base64);
        assertThat(Base64.getDecoder().decode(audio.get("data").asText())).isEqualTo(pcm);
    }

    @Test
    void parseServerContentExtractsAudioAndTranscriptsAndInterrupted() {
        byte[] pcm24k = "pcm-audio".getBytes(StandardCharsets.UTF_8);
        String audioB64 = Base64.getEncoder().encodeToString(pcm24k);
        String json = """
                {
                  "serverContent": {
                    "interrupted": true,
                    "inputTranscription": { "text": "hello user" },
                    "outputTranscription": { "text": "hello assistant" },
                    "modelTurn": {
                      "parts": [
                        { "inlineData": { "data": "%s", "mimeType": "audio/pcm;rate=24000" } }
                      ]
                    }
                  }
                }
                """.formatted(audioB64);

        GeminiLiveClient.ParsedServerContent parsed = GeminiLiveClient.parseServerContent(json);

        assertThat(parsed.interrupted).isTrue();
        assertThat(parsed.inputTranscription).isEqualTo("hello user");
        assertThat(parsed.outputTranscription).isEqualTo("hello assistant");
        assertThat(parsed.audioChunks).hasSize(1);
        assertThat(parsed.audioChunks.get(0)).isEqualTo(pcm24k);
        assertThat(parsed.toolCall).isFalse();
        assertThat(parsed.setupComplete).isFalse();
        assertThat(parsed.errorMessage).isNull();
    }

    @Test
    void parseServerContentMarksToolCallAndError() {
        GeminiLiveClient.ParsedServerContent tool =
                GeminiLiveClient.parseServerContent("{\"toolCall\":{\"functionCalls\":[]}}");
        assertThat(tool.toolCall).isTrue();

        GeminiLiveClient.ParsedServerContent error =
                GeminiLiveClient.parseServerContent("{\"error\":{\"code\":400,\"message\":\"bad\"}}");
        assertThat(error.errorMessage).contains("400");
    }

    @Test
    void parseServerContentMarksSetupComplete() {
        GeminiLiveClient.ParsedServerContent parsed =
                GeminiLiveClient.parseServerContent("{\"setupComplete\":{}}");

        assertThat(parsed.setupComplete).isTrue();
        assertThat(parsed.toolCall).isFalse();
        assertThat(parsed.errorMessage).isNull();
        assertThat(parsed.audioChunks).isEmpty();
    }

    @Test
    void sendAudioBeforeSocketReadyTimesOutWithIllegalStateException() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofMillis(50));
        client.setConnectingForTest();

        assertThatThrownBy(() -> client.sendAudio(new byte[] {0x01, 0x02}))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Gemini connection not ready");
    }

    @Test
    void sendAudioBeforeSetupCompleteTimesOutWithIllegalStateException() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofMillis(50));
        WebSocket ws = mock(WebSocket.class);
        client.setConnectedForTest(ws);

        assertThatThrownBy(() -> client.sendAudio(new byte[] {0x01, 0x02}))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Gemini setup not complete");
    }

    @Test
    void sendAudioAfterSetupCompleteSendsRealtimeInput() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofSeconds(1));
        WebSocket ws = mock(WebSocket.class);
        when(ws.sendText(anyString(), eq(true))).thenReturn(CompletableFuture.completedFuture(null));
        client.setConnectedForTest(ws);
        client.markSetupCompleteForTest();

        byte[] pcm = new byte[] {0x01, 0x02, 0x03, 0x04};
        client.sendAudio(pcm);

        verify(ws).sendText(anyString(), eq(true));
    }

    @Test
    void sendAudioAfterCloseFailsWithClosed() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofSeconds(1));
        WebSocket ws = mock(WebSocket.class);
        when(ws.sendClose(org.mockito.ArgumentMatchers.anyInt(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));
        client.setConnectedForTest(ws);
        client.close();

        assertThatThrownBy(() -> client.sendAudio(new byte[] {0x01}))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("GeminiLiveClient is closed");
    }

    @Test
    void handleJsonFrameMarksSetupCompleteFromBinaryPayloadString() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofSeconds(1));
        WebSocket ws = mock(WebSocket.class);
        when(ws.sendText(anyString(), eq(true))).thenReturn(CompletableFuture.completedFuture(null));
        client.setConnectedForTest(ws);

        // Exact bytes Gemini Live sends as a binary WebSocket frame for setupComplete.
        client.handleJsonFrameForTest("{\"setupComplete\":{}}");

        client.sendAudio(new byte[] {0x01, 0x02});
        verify(ws).sendText(anyString(), eq(true));
    }

    @Test
    void handleBinaryPayloadForwardsRawPcmToListener() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofSeconds(1));
        VoiceListener listener = mock(VoiceListener.class);
        client.setListenerForTest(listener);

        byte[] pcm = new byte[] {1, 2, 3, 4, 5, 6, 7, 8};
        client.handleBinaryPayloadForTest(pcm);

        org.mockito.ArgumentCaptor<byte[]> audioCaptor =
                org.mockito.ArgumentCaptor.forClass(byte[].class);
        verify(listener).onAudio(audioCaptor.capture());
        assertThat(audioCaptor.getValue()).isEqualTo(pcm);
    }

    @Test
    void handleBinaryPayloadMarksSetupCompleteFromJson() {
        GeminiLiveClient client = new GeminiLiveClient(
                "test-key",
                "gemini-live-2.5-flash-native-audio",
                "prompt",
                Duration.ofSeconds(1));
        WebSocket ws = mock(WebSocket.class);
        when(ws.sendText(anyString(), eq(true))).thenReturn(CompletableFuture.completedFuture(null));
        client.setConnectedForTest(ws);

        byte[] setupCompleteBinary = "{\"setupComplete\":{}}".getBytes(StandardCharsets.UTF_8);
        client.handleBinaryPayloadForTest(setupCompleteBinary);

        client.sendAudio(new byte[] {0x0A, 0x0B});
        verify(ws).sendText(anyString(), eq(true));
    }
}
