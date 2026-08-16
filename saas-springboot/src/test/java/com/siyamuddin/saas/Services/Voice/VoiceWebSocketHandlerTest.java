package com.siyamuddin.saas.Services.Voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.siyamuddin.saas.Config.Properties.VoiceProperties;
import com.siyamuddin.saas.Entity.User;
import com.siyamuddin.saas.Services.AuditService;
import com.siyamuddin.saas.Services.CustomUserDetailService;
import com.siyamuddin.saas.Services.RateLimitService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VoiceWebSocketHandlerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Mock
    private RateLimitService rateLimitService;

    @Mock
    private AuditService auditService;

    @Mock
    private CustomUserDetailService customUserDetailService;

    @Mock
    private VoiceUsageService voiceUsageService;

    @Mock
    private WebSocketSession session;

    private VoiceProperties voiceProperties;
    private User user;
    private Map<String, Object> attributes;

    @BeforeEach
    void setUp() {
        VoiceWebSocketHandler.clearActiveSessionCounts();

        voiceProperties = new VoiceProperties();
        voiceProperties.setGeminiApiKey("AIzaSyTestKey");
        voiceProperties.setGeminiModel("gemini-2.5-flash-native-audio-latest");
        voiceProperties.setSystemPrompt("You are a helpful AI assistant.");
        voiceProperties.setMaxSessionsPerUser(1);
        voiceProperties.setMaxSessionDurationSeconds(600);
        voiceProperties.setMaxDailyMinutesPerUser(30);
        voiceProperties.setMaxGlobalSessions(50);

        user = new User();
        user.setId(11);
        user.setEmail("voice@test.com");
        user.setName("Voice");
        user.setPassword("pw");

        attributes = new HashMap<>();
        attributes.put("username", "voice@test.com");
        attributes.put("userId", 11);
        attributes.put("user", user);

        org.mockito.Mockito.lenient().when(voiceUsageService.hasDailyQuota(org.mockito.ArgumentMatchers.anyString())).thenReturn(true);
        org.mockito.Mockito.lenient().when(voiceUsageService.tryAcquireGlobalSlot()).thenReturn(true);
        org.mockito.Mockito.lenient().when(voiceUsageService.maxSessionDurationSeconds()).thenReturn(600);
        org.mockito.Mockito.lenient().when(voiceUsageService.remainingDailySeconds(org.mockito.ArgumentMatchers.anyString())).thenReturn(1800L);
        org.mockito.Mockito.lenient().when(voiceUsageService.maxSessionsPerUser()).thenReturn(1);
        org.mockito.Mockito.lenient().when(voiceUsageService.resolveGeminiApiKey()).thenReturn("AIzaSyTestKey");
        org.mockito.Mockito.lenient().when(voiceUsageService.resolveGeminiModel()).thenReturn("gemini-2.5-flash-native-audio-latest");
        org.mockito.Mockito.lenient().when(voiceUsageService.resolveSystemPrompt()).thenReturn("You are a helpful AI assistant.");
    }

    @AfterEach
    void tearDown() {
        VoiceWebSocketHandler.clearActiveSessionCounts();
    }

    @Test
    void afterConnectionEstablishedWithKeyConnectsClient() throws Exception {
        GeminiLiveClient mockClient = mock(GeminiLiveClient.class);
        AtomicReference<VoiceListener> listenerRef = new AtomicReference<>();
        doAnswer(invocation -> {
            listenerRef.set(invocation.getArgument(0));
            return null;
        }).when(mockClient).connect(any());

        when(session.getAttributes()).thenReturn(attributes);
        when(session.getId()).thenReturn("sess-1");
        when(rateLimitService.tryConsumeGeneralApi("voice:voice@test.com")).thenReturn(true);

        VoiceWebSocketHandler handler = newHandler(() -> mockClient);
        handler.afterConnectionEstablished(session);

        verify(mockClient).connect(any(VoiceListener.class));
        verify(auditService).logSecurityEvent(user, "VOICE_SESSION_START", true);
        verify(session, never()).sendMessage(any(TextMessage.class));
        assertThat(listenerRef.get()).isNotNull();
    }

    @Test
    void afterConnectionEstablishedRateLimitedSendsErrorAndCloses() throws Exception {
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        when(rateLimitService.tryConsumeGeneralApi("voice:voice@test.com")).thenReturn(false);

        GeminiLiveClient mockClient = mock(GeminiLiveClient.class);
        VoiceWebSocketHandler handler = newHandler(() -> mockClient);
        handler.afterConnectionEstablished(session);

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        JsonNode json = MAPPER.readTree(captor.getValue().getPayload());
        assertThat(json.get("type").asText()).isEqualTo("error");
        assertThat(json.get("code").asText()).isEqualTo("RATE_LIMITED");
        verify(session).close(CloseStatus.NORMAL);
        verify(mockClient, never()).connect(any());
    }

    @Test
    void afterConnectionEstablishedOverSessionCapSendsSessionLimit() throws Exception {
        when(session.getAttributes()).thenReturn(attributes);
        when(session.getId()).thenReturn("sess-cap-1");
        when(rateLimitService.tryConsumeGeneralApi("voice:voice@test.com")).thenReturn(true);

        GeminiLiveClient firstClient = mock(GeminiLiveClient.class);
        doAnswer(invocation -> null).when(firstClient).connect(any());

        VoiceWebSocketHandler firstHandler = newHandler(() -> firstClient);
        firstHandler.afterConnectionEstablished(session);

        WebSocketSession secondSession = mock(WebSocketSession.class);
        when(secondSession.getAttributes()).thenReturn(attributes);
        when(secondSession.isOpen()).thenReturn(true);

        GeminiLiveClient secondClient = mock(GeminiLiveClient.class);
        VoiceWebSocketHandler secondHandler = newHandler(() -> secondClient);
        secondHandler.afterConnectionEstablished(secondSession);

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(secondSession).sendMessage(captor.capture());
        JsonNode json = MAPPER.readTree(captor.getValue().getPayload());
        assertThat(json.get("type").asText()).isEqualTo("error");
        assertThat(json.get("code").asText()).isEqualTo("SESSION_LIMIT");
        verify(secondSession).close(CloseStatus.NORMAL);
        verify(secondClient, never()).connect(any());
    }

    @Test
    void afterConnectionEstablishedBlankKeySendsVoiceDisabled() throws Exception {
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        when(voiceUsageService.resolveGeminiApiKey()).thenReturn("  ");

        GeminiLiveClient mockClient = mock(GeminiLiveClient.class);
        VoiceWebSocketHandler handler = newHandler(() -> mockClient);
        handler.afterConnectionEstablished(session);

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        JsonNode json = MAPPER.readTree(captor.getValue().getPayload());
        assertThat(json.get("type").asText()).isEqualTo("error");
        assertThat(json.get("code").asText()).isEqualTo("VOICE_DISABLED");
        verify(session).close(CloseStatus.NORMAL);
        verify(mockClient, never()).connect(any());
        verify(rateLimitService, never()).tryConsumeGeneralApi(any());
    }

    @Test
    void handleBinaryMessageCallsSendAudio() throws Exception {
        GeminiLiveClient mockClient = mock(GeminiLiveClient.class);
        doAnswer(invocation -> null).when(mockClient).connect(any());

        when(session.getAttributes()).thenReturn(attributes);
        when(session.getId()).thenReturn("sess-bin");
        when(rateLimitService.tryConsumeGeneralApi("voice:voice@test.com")).thenReturn(true);

        VoiceWebSocketHandler handler = newHandler(() -> mockClient);
        handler.afterConnectionEstablished(session);

        byte[] pcm = new byte[] {1, 2, 3, 4};
        handler.handleBinaryMessage(session, new BinaryMessage(pcm));

        verify(mockClient).sendAudio(pcm);
    }

    @Test
    void listenerOnAudioSendsBinaryFrameToSession() throws Exception {
        GeminiLiveClient mockClient = mock(GeminiLiveClient.class);
        AtomicReference<VoiceListener> listenerRef = new AtomicReference<>();
        doAnswer(invocation -> {
            listenerRef.set(invocation.getArgument(0));
            return null;
        }).when(mockClient).connect(any());

        when(session.getAttributes()).thenReturn(attributes);
        when(session.getId()).thenReturn("sess-audio");
        when(session.isOpen()).thenReturn(true);
        when(rateLimitService.tryConsumeGeneralApi("voice:voice@test.com")).thenReturn(true);

        VoiceWebSocketHandler handler = newHandler(() -> mockClient);
        handler.afterConnectionEstablished(session);

        byte[] pcm24k = new byte[] {9, 8, 7, 6};
        listenerRef.get().onAudio(pcm24k);

        ArgumentCaptor<BinaryMessage> captor = ArgumentCaptor.forClass(BinaryMessage.class);
        verify(session).sendMessage(captor.capture());
        ByteBuffer payload = captor.getValue().getPayload();
        byte[] received = new byte[payload.remaining()];
        payload.get(received);
        assertThat(received).isEqualTo(pcm24k);
    }

    @Test
    void afterConnectionClosedAuditsSessionEnd() throws Exception {
        GeminiLiveClient mockClient = mock(GeminiLiveClient.class);
        doAnswer(invocation -> null).when(mockClient).connect(any());

        when(session.getAttributes()).thenReturn(attributes);
        when(session.getId()).thenReturn("sess-end");
        when(rateLimitService.tryConsumeGeneralApi("voice:voice@test.com")).thenReturn(true);

        VoiceWebSocketHandler handler = newHandler(() -> mockClient);
        handler.afterConnectionEstablished(session);
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);

        verify(mockClient).close();
        verify(auditService).logSecurityEvent(user, "VOICE_SESSION_END", true);
    }

    private VoiceWebSocketHandler newHandler(Supplier<GeminiLiveClient> supplier) {
        return new VoiceWebSocketHandler(
                voiceProperties,
                rateLimitService,
                auditService,
                customUserDetailService,
                MAPPER,
                voiceUsageService,
                supplier);
    }
}
