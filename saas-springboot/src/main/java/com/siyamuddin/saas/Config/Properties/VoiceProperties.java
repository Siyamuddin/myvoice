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
    private String geminiModel = "gemini-live-2.5-flash-native-audio";
    private String systemPrompt = "You are a helpful AI assistant.";
    private int maxSessionsPerUser = 1;

    @PostConstruct
    public void validate() {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("app.voice.gemini-api-key not set — voice agent disabled until GEMINI_API_KEY is configured.");
        }
    }
}
