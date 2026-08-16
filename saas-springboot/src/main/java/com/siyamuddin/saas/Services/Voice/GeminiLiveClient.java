package com.siyamuddin.saas.Services.Voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Outbound WebSocket client for the Gemini Live {@code BidiGenerateContent} API.
 * <p>
 * Listener callbacks may arrive on WebSocket listener threads; callers must handle concurrency.
 */
@Slf4j
public class GeminiLiveClient {

    private static final String WS_URL_TEMPLATE =
            "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=%s";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    enum State {
        CONNECTING,
        CONNECTED,
        CLOSED
    }

    private static final Duration DEFAULT_SETUP_TIMEOUT = Duration.ofSeconds(10);

    private final String apiKey;
    private final String geminiModel;
    private final String systemPrompt;
    private final Duration setupTimeout;
    private final CompletableFuture<Void> setupComplete = new CompletableFuture<>();
    private final CompletableFuture<WebSocket> socketReady = new CompletableFuture<>();

    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicReference<WebSocket> webSocket = new AtomicReference<>();
    private final AtomicReference<VoiceListener> listenerRef = new AtomicReference<>();

    public GeminiLiveClient(String apiKey, String geminiModel, String systemPrompt) {
        this(apiKey, geminiModel, systemPrompt, DEFAULT_SETUP_TIMEOUT);
    }

    /**
     * Package-private constructor allowing a custom setup-complete wait timeout (used by tests).
     */
    GeminiLiveClient(String apiKey, String geminiModel, String systemPrompt, Duration setupTimeout) {
        this.apiKey = Objects.requireNonNull(apiKey, "apiKey");
        this.geminiModel = Objects.requireNonNull(geminiModel, "geminiModel");
        this.systemPrompt = Objects.requireNonNull(systemPrompt, "systemPrompt");
        this.setupTimeout = Objects.requireNonNull(setupTimeout, "setupTimeout");
        if (setupTimeout.isNegative() || setupTimeout.isZero()) {
            throw new IllegalArgumentException("setupTimeout must be positive");
        }
    }

    /**
     * Opens a WebSocket to Gemini Live and sends the setup message when the socket is open.
     */
    public void connect(VoiceListener listener) {
        Objects.requireNonNull(listener, "listener");
        if (!state.compareAndSet(State.CLOSED, State.CONNECTING)) {
            throw new IllegalStateException("GeminiLiveClient is already connecting or connected");
        }
        listenerRef.set(listener);

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();

        URI uri = URI.create(String.format(WS_URL_TEMPLATE, apiKey));
        httpClient.newWebSocketBuilder()
                .buildAsync(uri, new GeminiWebSocketListener())
                .whenComplete((ws, error) -> {
                    if (error != null) {
                        log.error("Gemini Live WebSocket connect failed", error);
                        state.set(State.CLOSED);
                        webSocket.set(null);
                        failSocketReady(error);
                        failSetup(error);
                        notifyError(error);
                        notifyClose();
                        return;
                    }
                    webSocket.set(ws);
                    log.info("Gemini Live WebSocket opened (model {})", geminiModel);
                    try {
                        String setup = buildSetupMessage(geminiModel, systemPrompt);
                        ws.sendText(setup, true);
                        log.info("Gemini setup message sent");
                        // CONNECTED means the socket is open and setup was sent; audio must still
                        // wait for Gemini's setupComplete (see awaitSetupComplete).
                        state.set(State.CONNECTED);
                        socketReady.complete(ws);
                    } catch (Exception e) {
                        state.set(State.CLOSED);
                        failSocketReady(e);
                        failSetup(e);
                        try {
                            ws.sendClose(WebSocket.NORMAL_CLOSURE, "setup failed");
                        } catch (Exception ignored) {
                            // best-effort
                        }
                        notifyError(e);
                        notifyClose();
                    }
                });
    }

    /**
     * Sends a 16 kHz PCM audio chunk as a Gemini {@code realtimeInput} frame.
     * Blocks until the outbound socket is open and Gemini has acknowledged setup
     * ({@code setupComplete}), or fails if either gate does not complete within the setup timeout.
     */
    public void sendAudio(byte[] pcm16k) {
        Objects.requireNonNull(pcm16k, "pcm16k");
        if (state.get() == State.CLOSED) {
            log.warn("sendAudio called on closed GeminiLiveClient");
            throw new IllegalStateException("GeminiLiveClient is closed");
        }
        WebSocket ws = awaitSocketReady();
        awaitSetupComplete();
        log.info("sendAudio forwarding chunk of {} bytes", pcm16k.length);
        String message = buildRealtimeAudioMessage(AudioCodec.toBase64(pcm16k));
        ws.sendText(message, true);
    }

    /**
     * Gracefully closes the WebSocket if open.
     */
    public void close() {
        State previous = state.getAndSet(State.CLOSED);
        IllegalStateException closed =
                new IllegalStateException("GeminiLiveClient closed before setup complete");
        failSocketReady(closed);
        failSetup(closed);
        WebSocket ws = webSocket.getAndSet(null);
        if (ws == null || previous == State.CLOSED) {
            return;
        }
        try {
            ws.sendClose(WebSocket.NORMAL_CLOSURE, "client close").join();
        } catch (Exception e) {
            log.debug("Error while closing Gemini Live WebSocket", e);
            try {
                ws.abort();
            } catch (Exception ignored) {
                // best-effort
            }
        }
    }

    public boolean isConnected() {
        return state.get() == State.CONNECTED && webSocket.get() != null;
    }

    WebSocket getWebSocket() {
        return webSocket.get();
    }

    State getState() {
        return state.get();
    }

    static String buildSetupMessage(String model, String prompt) {
        try {
            ObjectNode root = MAPPER.createObjectNode();
            ObjectNode setup = root.putObject("setup");
            setup.put("model", "models/" + model);
            ObjectNode generationConfig = setup.putObject("generationConfig");
            ArrayNode modalities = generationConfig.putArray("responseModalities");
            modalities.add("AUDIO");
            ObjectNode realtimeInputConfig = setup.putObject("realtimeInputConfig");
            realtimeInputConfig.putObject("automaticActivityDetection");
            ObjectNode systemInstruction = setup.putObject("systemInstruction");
            ArrayNode parts = systemInstruction.putArray("parts");
            ObjectNode part = parts.addObject();
            part.put("text", prompt);
            setup.putObject("inputAudioTranscription");
            setup.putObject("outputAudioTranscription");
            return MAPPER.writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build setup message", e);
        }
    }

    static String buildRealtimeAudioMessage(String base64Audio) {
        try {
            ObjectNode root = MAPPER.createObjectNode();
            ObjectNode realtimeInput = root.putObject("realtimeInput");
            ObjectNode audio = realtimeInput.putObject("audio");
            audio.put("data", base64Audio);
            audio.put("mimeType", "audio/pcm;rate=16000");
            return MAPPER.writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build realtime audio message", e);
        }
    }

    /**
     * Parses a Gemini Live inbound JSON text frame for {@code setupComplete} /
     * {@code serverContent} / errors / tool calls.
     */
    static ParsedServerContent parseServerContent(String json) {
        try {
            JsonNode root = MAPPER.readTree(json);
            ParsedServerContent result = new ParsedServerContent();

            if (root.has("setupComplete")) {
                result.setupComplete = true;
                return result;
            }

            if (root.has("error")) {
                result.errorMessage = root.get("error").toString();
                return result;
            }

            if (root.has("toolCall")) {
                result.toolCall = true;
                return result;
            }

            JsonNode serverContent = root.get("serverContent");
            if (serverContent == null || serverContent.isNull()) {
                return result;
            }

            if (serverContent.path("interrupted").asBoolean(false)) {
                result.interrupted = true;
            }

            JsonNode inputTranscription = serverContent.get("inputTranscription");
            if (inputTranscription != null && inputTranscription.hasNonNull("text")) {
                result.inputTranscription = inputTranscription.get("text").asText();
            }

            JsonNode outputTranscription = serverContent.get("outputTranscription");
            if (outputTranscription != null && outputTranscription.hasNonNull("text")) {
                result.outputTranscription = outputTranscription.get("text").asText();
            }

            JsonNode modelTurn = serverContent.get("modelTurn");
            if (modelTurn != null) {
                JsonNode parts = modelTurn.get("parts");
                if (parts != null && parts.isArray()) {
                    for (JsonNode part : parts) {
                        JsonNode inlineData = part.get("inlineData");
                        if (inlineData == null) {
                            continue;
                        }
                        JsonNode data = inlineData.get("data");
                        if (data != null && data.isTextual()) {
                            result.audioChunks.add(AudioCodec.fromBase64(data.asText()));
                        }
                    }
                }
            }

            return result;
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse server content JSON", e);
        }
    }

    private void dispatchParsed(ParsedServerContent parsed) {
        VoiceListener listener = listenerRef.get();
        if (listener == null) {
            return;
        }
        if (parsed.errorMessage != null) {
            listener.onError(new IllegalStateException(parsed.errorMessage));
            return;
        }
        if (parsed.toolCall) {
            log.debug("Ignoring toolCall frame (Phase 5)");
            return;
        }
        if (parsed.interrupted) {
            listener.onInterrupted();
        }
        if (parsed.inputTranscription != null) {
            listener.onUserTranscript(parsed.inputTranscription);
        }
        if (parsed.outputTranscription != null) {
            listener.onAssistantTranscript(parsed.outputTranscription);
        }
        for (byte[] chunk : parsed.audioChunks) {
            listener.onAudio(chunk);
        }
    }

    /**
     * Shared handler for complete JSON frames whether they arrived as text or binary.
     */
    private void handleJsonFrame(String json) {
        try {
            ParsedServerContent parsed = parseServerContent(json);
            if (parsed.setupComplete) {
                markSetupComplete();
                // Do not route setupComplete through VoiceListener.
            } else {
                dispatchParsed(parsed);
            }
        } catch (Exception e) {
            log.warn("Failed to handle Gemini JSON frame", e);
            notifyError(e);
        }
    }

    private static final int MAX_BINARY_JSON_BYTES = 64 * 1024;

    /**
     * Handles a complete binary WebSocket payload: UTF-8 JSON (e.g. setupComplete) or raw PCM.
     */
    private void handleBinaryPayload(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return;
        }
        if (looksLikeJsonBinary(bytes)) {
            String json = new String(bytes, StandardCharsets.UTF_8);
            handleJsonFrame(json);
            return;
        }
        VoiceListener listener = listenerRef.get();
        if (listener != null) {
            listener.onAudio(Arrays.copyOf(bytes, bytes.length));
        }
    }

    private static boolean looksLikeJsonBinary(byte[] bytes) {
        return bytes.length < MAX_BINARY_JSON_BYTES && bytes[0] == '{';
    }

    private WebSocket awaitSocketReady() {
        try {
            return socketReady.get(setupTimeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            log.warn("awaitSocketReady timed out waiting for Gemini WebSocket", e);
            throw new IllegalStateException("Gemini connection not ready", e);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            log.warn("awaitSocketReady failed: Gemini WebSocket not ready", cause);
            throw new IllegalStateException("Gemini connection not ready", cause);
        } catch (CancellationException e) {
            log.warn("awaitSocketReady cancelled waiting for Gemini WebSocket", e);
            throw new IllegalStateException("Gemini connection not ready", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("awaitSocketReady interrupted waiting for Gemini WebSocket", e);
            throw new IllegalStateException("Gemini connection not ready", e);
        }
    }

    private void awaitSetupComplete() {
        try {
            setupComplete.get(setupTimeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            log.warn("awaitSetupComplete timed out waiting for Gemini setupComplete", e);
            throw new IllegalStateException("Gemini setup not complete", e);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            log.warn("awaitSetupComplete failed: Gemini setup not complete", cause);
            throw new IllegalStateException("Gemini setup not complete", cause);
        } catch (CancellationException e) {
            log.warn("awaitSetupComplete cancelled waiting for Gemini setupComplete", e);
            throw new IllegalStateException("Gemini setup not complete", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("awaitSetupComplete interrupted waiting for Gemini setupComplete", e);
            throw new IllegalStateException("Gemini setup not complete", e);
        }
    }

    private void markSetupComplete() {
        log.info("Gemini Live setupComplete received");
        setupComplete.complete(null);
    }

    private void failSocketReady(Throwable cause) {
        if (socketReady.isDone()) {
            return;
        }
        Throwable failure = cause != null
                ? cause
                : new IllegalStateException("Gemini connection not ready");
        socketReady.completeExceptionally(failure);
    }

    private void failSetup(Throwable cause) {
        if (setupComplete.isDone()) {
            return;
        }
        log.warn("Gemini Live setup failed/closed before ready: {}", String.valueOf(cause));
        Throwable failure = cause != null
                ? cause
                : new IllegalStateException("Gemini setup not complete");
        setupComplete.completeExceptionally(failure);
    }

    private void notifyError(Throwable t) {
        VoiceListener listener = listenerRef.get();
        if (listener != null) {
            listener.onError(t);
        }
    }

    private void notifyClose() {
        VoiceListener listener = listenerRef.get();
        if (listener != null) {
            listener.onClose();
        }
    }

    /** Test-only: marks the client as connecting without opening a socket. */
    void setConnectingForTest() {
        state.set(State.CONNECTING);
    }

    /** Test-only: marks the client as connected without completing Gemini setup. */
    void setConnectedForTest(WebSocket ws) {
        WebSocket socket = Objects.requireNonNull(ws, "ws");
        webSocket.set(socket);
        state.set(State.CONNECTED);
        socketReady.complete(socket);
    }

    /** Test-only: signals that Gemini setupComplete was received. */
    void markSetupCompleteForTest() {
        markSetupComplete();
    }

    /** Test-only: attaches a listener without opening a socket. */
    void setListenerForTest(VoiceListener listener) {
        listenerRef.set(Objects.requireNonNull(listener, "listener"));
    }

    /** Test-only: processes a JSON frame via the shared text/binary handler. */
    void handleJsonFrameForTest(String json) {
        handleJsonFrame(json);
    }

    /** Test-only: processes a complete binary payload as {@code onBinary} would when {@code last=true}. */
    void handleBinaryPayloadForTest(byte[] bytes) {
        handleBinaryPayload(bytes);
    }

    private final class GeminiWebSocketListener implements WebSocket.Listener {
        private final StringBuilder textBuffer = new StringBuilder();
        private final ByteArrayOutputStream binaryBuffer = new ByteArrayOutputStream();

        @Override
        public void onOpen(WebSocket webSocket) {
            log.info("Gemini onOpen; requesting more");
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            log.info("Gemini onText received: last={} data={}", last, data);
            textBuffer.append(data);
            if (last) {
                String json = textBuffer.toString();
                textBuffer.setLength(0);
                log.info("Gemini onText complete frame: {}", json);
                handleJsonFrame(json);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
            log.info("Gemini onBinary received: bytes={} last={}", data.remaining(), last);
            byte[] chunk = new byte[data.remaining()];
            data.get(chunk);
            binaryBuffer.write(chunk, 0, chunk.length);
            if (last) {
                byte[] payload = binaryBuffer.toByteArray();
                binaryBuffer.reset();
                handleBinaryPayload(payload);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            log.warn("Gemini Live WebSocket closed: status={} reason={}", statusCode, reason);
            state.set(State.CLOSED);
            GeminiLiveClient.this.webSocket.set(null);
            IllegalStateException closed = new IllegalStateException(
                    "Gemini WebSocket closed before setup complete: " + statusCode + " " + reason);
            failSocketReady(closed);
            failSetup(closed);
            notifyClose();
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            log.error("Gemini Live WebSocket error", error);
            state.set(State.CLOSED);
            GeminiLiveClient.this.webSocket.set(null);
            failSocketReady(error);
            failSetup(error);
            notifyError(error);
            notifyClose();
        }
    }

    static final class ParsedServerContent {
        final List<byte[]> audioChunks = new ArrayList<>();
        String inputTranscription;
        String outputTranscription;
        boolean interrupted;
        boolean toolCall;
        boolean setupComplete;
        String errorMessage;
    }
}
