package com.siyamuddin.saas.Config.Properties;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Slf4j
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.voice")
public class VoiceProperties {
    private String geminiApiKey;
    private String geminiModel = "gemini-2.5-flash-native-audio-latest";
    private String systemPrompt = "You are a helpful AI assistant. You speak English, Bangla, and Korean naturally and switch to match the user's language. Be concise and conversational.";
    private int maxSessionsPerUser = 1;
    /** Free-beta: hard stop for a single voice session. */
    private int maxSessionDurationSeconds = 600;
    /** Free-beta: total talk minutes per user per UTC day. */
    private int maxDailyMinutesPerUser = 30;
    /** Free-beta: max concurrent Gemini sessions across all users on this instance. */
    private int maxGlobalSessions = 50;

    @PostConstruct
    public void validate() {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("app.voice.gemini-api-key not set — voice agent disabled until GEMINI_API_KEY is configured.");
        }
        if (maxSessionDurationSeconds <= 0) {
            throw new IllegalStateException("app.voice.max-session-duration-seconds must be > 0");
        }
        if (maxDailyMinutesPerUser <= 0) {
            throw new IllegalStateException("app.voice.max-daily-minutes-per-user must be > 0");
        }
        if (maxGlobalSessions <= 0) {
            throw new IllegalStateException("app.voice.max-global-sessions must be > 0");
        }
    }
}
