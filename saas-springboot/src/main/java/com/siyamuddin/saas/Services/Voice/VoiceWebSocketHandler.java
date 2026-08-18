package com.siyamuddin.saas.Services.Voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.siyamuddin.saas.Config.Properties.VoiceProperties;
import com.siyamuddin.saas.Entity.User;
import com.siyamuddin.saas.Services.AuditService;
import com.siyamuddin.saas.Services.CustomUserDetailService;
import com.siyamuddin.saas.Services.RateLimitService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Slf4j
@Component
public class VoiceWebSocketHandler extends AbstractWebSocketHandler {

    private static final ConcurrentHashMap<String, Integer> ACTIVE_SESSIONS = new ConcurrentHashMap<>();

    private final VoiceProperties voiceProperties;
    private final RateLimitService rateLimitService;
    private final AuditService auditService;
    private final CustomUserDetailService customUserDetailService;
    private final ObjectMapper objectMapper;
    private final VoiceUsageService voiceUsageService;
    private final Supplier<GeminiLiveClient> clientFactory;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "voice-session-watchdog");
        t.setDaemon(true);
        return t;
    });

    private final ConcurrentHashMap<String, VoiceSessionHolder> sessions = new ConcurrentHashMap<>();

    @Autowired
    public VoiceWebSocketHandler(
            VoiceProperties voiceProperties,
            RateLimitService rateLimitService,
            AuditService auditService,
            CustomUserDetailService customUserDetailService,
            ObjectMapper objectMapper,
            VoiceUsageService voiceUsageService) {
        this(voiceProperties, rateLimitService, auditService, customUserDetailService, objectMapper, voiceUsageService, null);
    }

    VoiceWebSocketHandler(
            VoiceProperties voiceProperties,
            RateLimitService rateLimitService,
            AuditService auditService,
            CustomUserDetailService customUserDetailService,
            ObjectMapper objectMapper,
            VoiceUsageService voiceUsageService,
            Supplier<GeminiLiveClient> clientFactory) {
        this.voiceProperties = voiceProperties;
        this.rateLimitService = rateLimitService;
        this.auditService = auditService;
        this.customUserDetailService = customUserDetailService;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.voiceUsageService = voiceUsageService;
        this.clientFactory = clientFactory != null
                ? clientFactory
                : () -> createClient(this.voiceProperties);
    }

    GeminiLiveClient createClient(VoiceProperties props) {
        return new GeminiLiveClient(
                voiceUsageService.resolveGeminiApiKey(),
                voiceUsageService.resolveGeminiModel(),
                voiceUsageService.resolveSystemPrompt());
    }

    static void clearActiveSessionCounts() {
        ACTIVE_SESSIONS.clear();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String username = (String) session.getAttributes().get("username");
        Integer userId = (Integer) session.getAttributes().get("userId");
        User user = resolveUser(session, username);

        String apiKey = voiceUsageService.resolveGeminiApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            sendError(session, "VOICE_DISABLED", null);
            session.close(CloseStatus.NORMAL);
            return;
        }

        if (username == null || username.isBlank()) {
            sendError(session, "UNAUTHORIZED", "Missing user on session");
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        if (!voiceUsageService.hasDailyQuota(username)) {
            sendError(session, "USAGE_LIMIT", "Daily free-beta voice minutes exhausted");
            session.close(CloseStatus.NORMAL);
            return;
        }

        if (!voiceUsageService.tryAcquireGlobalSlot()) {
            sendError(session, "GLOBAL_CAPACITY", "Voice service is at capacity");
            session.close(CloseStatus.NORMAL);
            return;
        }

        boolean sessionAcquired = false;
        boolean globalHeld = true;
        try {
            if (!rateLimitService.tryConsumeGeneralApi("voice:" + username)) {
                sendError(session, "RATE_LIMITED", null);
                session.close(CloseStatus.NORMAL);
                return;
            }

            if (!tryAcquireSession(username)) {
                sendError(session, "SESSION_LIMIT", null);
                session.close(CloseStatus.NORMAL);
                return;
            }
            sessionAcquired = true;

            GeminiLiveClient client = clientFactory.get();
            VoiceListener listener = createListener(session);
            client.connect(listener);

            long startedAtMs = System.currentTimeMillis();
            long maxDurationSeconds = Math.min(
                    voiceUsageService.maxSessionDurationSeconds(),
                    Math.max(1, voiceUsageService.remainingDailySeconds(username)));

            ScheduledFuture<?> timeoutFuture = scheduler.schedule(() -> {
                sendError(session, "SESSION_DURATION_LIMIT", "Free-beta session time limit reached");
                try {
                    if (session.isOpen()) {
                        session.close(CloseStatus.NORMAL);
                    }
                } catch (IOException e) {
                    log.debug("Failed to close voice session after duration limit", e);
                }
            }, maxDurationSeconds, TimeUnit.SECONDS);

            sessions.put(
                    session.getId(),
                    new VoiceSessionHolder(username, userId, user, client, listener, startedAtMs, timeoutFuture, true));
            globalHeld = false;

            if (user != null) {
                auditService.logSecurityEvent(user, "VOICE_SESSION_START", true);
            }
        } catch (Exception e) {
            log.error("Failed to establish Gemini Live session for user {}", username, e);
            if (sessionAcquired) {
                releaseSession(username);
            }
            sendError(session, "GEMINI_CONNECT_FAILED", e.getMessage());
            session.close(CloseStatus.SERVER_ERROR);
        } finally {
            if (globalHeld) {
                voiceUsageService.releaseGlobalSlot();
            }
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        VoiceSessionHolder holder = sessions.get(session.getId());
        if (holder == null || holder.client() == null) {
            return;
        }
        try {
            ByteBuffer payload = message.getPayload();
            byte[] pcm;
            if (payload.hasArray() && payload.arrayOffset() == 0 && payload.remaining() == payload.array().length) {
                pcm = payload.array();
            } else {
                pcm = new byte[payload.remaining()];
                payload.asReadOnlyBuffer().get(pcm);
            }
            holder.client().sendAudio(pcm);
        } catch (IllegalStateException e) {
            sendError(session, "GEMINI_DISCONNECTED", null);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        VoiceSessionHolder holder = sessions.get(session.getId());
        JsonNode root = objectMapper.readTree(message.getPayload());
        String type = root.path("type").asText();

        if ("stop".equals(type)) {
            if (holder != null && holder.client() != null) {
                holder.client().close();
            }
            if (session.isOpen()) {
                session.close(CloseStatus.NORMAL);
            }
            return;
        }

        if ("ping".equals(type)) {
            sendJson(session, Map.of("type", "pong"));
            return;
        }

        if ("audio_stream_end".equals(type)) {
            if (holder != null && holder.client() != null) {
                try {
                    holder.client().sendAudioStreamEnd();
                } catch (IllegalStateException e) {
                    log.debug("audio_stream_end ignored; Gemini not ready", e);
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        VoiceSessionHolder holder = sessions.remove(session.getId());
        if (holder == null) {
            return;
        }

        if (holder.timeoutFuture() != null) {
            holder.timeoutFuture().cancel(false);
        }

        long elapsedSeconds = Math.max(1, (System.currentTimeMillis() - holder.startedAtMs()) / 1000L);
        voiceUsageService.recordSessionSeconds(holder.username(), elapsedSeconds);

        releaseSession(holder.username());
        if (holder.heldGlobalSlot()) {
            voiceUsageService.releaseGlobalSlot();
        }

        try {
            if (holder.client() != null) {
                holder.client().close();
            }
        } catch (Exception e) {
            log.debug("Error closing Gemini client on session end", e);
        }
        if (holder.user() != null) {
            auditService.logSecurityEvent(holder.user(), "VOICE_SESSION_END", true);
        }
    }

    private VoiceListener createListener(WebSocketSession session) {
        return new VoiceListener() {
            @Override
            public void onAudio(byte[] pcm24k) {
                sendAudioJson(session, pcm24k);
            }

            @Override
            public void onUserTranscript(String text) {
                sendJson(session, Map.of("type", "user_transcript", "text", text != null ? text : ""));
            }

            @Override
            public void onAssistantTranscript(String text) {
                sendJson(session, Map.of("type", "assistant_transcript", "text", text != null ? text : ""));
            }

            @Override
            public void onInterrupted() {
                sendJson(session, Map.of("type", "interrupted"));
            }

            @Override
            public void onTurnComplete() {
                sendJson(session, Map.of("type", "audio_end"));
            }

            @Override
            public void onError(Throwable t) {
                log.warn("Gemini Live error for session {}: {}", session.getId(), t.toString());
                String message = t.getMessage() != null ? t.getMessage() : t.toString();
                sendJson(session, Map.of("type", "error", "message", message));
            }

            @Override
            public void onClose() {
                VoiceSessionHolder holder = sessions.get(session.getId());
                if (holder == null || !session.isOpen()) {
                    return;
                }
                log.warn("Gemini Live socket closed; reconnecting agent for session {}", session.getId());
                try {
                    GeminiLiveClient next = clientFactory.get();
                    VoiceListener listener = createListener(session);
                    next.connect(listener);
                    sessions.put(
                            session.getId(),
                            new VoiceSessionHolder(
                                    holder.username(),
                                    holder.userId(),
                                    holder.user(),
                                    next,
                                    listener,
                                    holder.startedAtMs(),
                                    holder.timeoutFuture(),
                                    holder.heldGlobalSlot()));
                    sendJson(session, Map.of("type", "agent_reconnected"));
                } catch (Exception e) {
                    log.error("Failed to reconnect Gemini for session {}", session.getId(), e);
                    sendJson(session, Map.of(
                            "type", "error",
                            "code", "GEMINI_CONNECT_FAILED",
                            "message", "Voice agent disconnected. Tap Retry."));
                }
            }
        };
    }

    private User resolveUser(WebSocketSession session, String username) {
        Object attr = session.getAttributes().get("user");
        if (attr instanceof User user) {
            return user;
        }
        if (username == null || username.isBlank()) {
            return null;
        }
        try {
            return (User) customUserDetailService.loadUserByUsername(username);
        } catch (Exception e) {
            log.debug("Could not load user {} for voice audit", username, e);
            return null;
        }
    }

    private boolean tryAcquireSession(String username) {
        synchronized (ACTIVE_SESSIONS) {
            int count = ACTIVE_SESSIONS.getOrDefault(username, 0);
            if (count >= voiceUsageService.maxSessionsPerUser()) {
                return false;
            }
            ACTIVE_SESSIONS.put(username, count + 1);
            return true;
        }
    }

    private void releaseSession(String username) {
        if (username == null) {
            return;
        }
        synchronized (ACTIVE_SESSIONS) {
            Integer count = ACTIVE_SESSIONS.get(username);
            if (count == null) {
                return;
            }
            if (count <= 1) {
                ACTIVE_SESSIONS.remove(username);
            } else {
                ACTIVE_SESSIONS.put(username, count - 1);
            }
        }
    }

    private void sendError(WebSocketSession session, String code, String message) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "error");
        node.put("code", code);
        if (message != null) {
            node.put("message", message);
        }
        try {
            sendRawText(session, objectMapper.writeValueAsString(node));
        } catch (Exception e) {
            log.debug("Failed to send error frame", e);
        }
    }

    private void sendJson(WebSocketSession session, Map<String, ?> payload) {
        try {
            sendRawText(session, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.debug("Failed to send JSON frame", e);
        }
    }

    private void sendRawText(WebSocketSession session, String json) throws IOException {
        synchronized (session) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        }
    }

    private void sendAudioJson(WebSocketSession session, byte[] pcm24k) {
        if (pcm24k == null || pcm24k.length == 0) {
            return;
        }
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "audio");
        node.put("mimeType", "audio/pcm;rate=24000");
        node.put("data", AudioCodec.toBase64(pcm24k));
        try {
            sendRawText(session, objectMapper.writeValueAsString(node));
        } catch (Exception e) {
            log.debug("Failed to send audio JSON frame", e);
        }
    }

    record VoiceSessionHolder(
            String username,
            Integer userId,
            User user,
            GeminiLiveClient client,
            VoiceListener listener,
            long startedAtMs,
            ScheduledFuture<?> timeoutFuture,
            boolean heldGlobalSlot) {
    }
}
