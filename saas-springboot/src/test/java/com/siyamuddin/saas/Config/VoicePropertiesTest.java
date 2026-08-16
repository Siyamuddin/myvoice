package com.siyamuddin.saas.Config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.siyamuddin.saas.Config.Properties.VoiceProperties;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class VoicePropertiesTest {

    @Test
    void defaultsAreSet() {
        VoiceProperties properties = new VoiceProperties();

        assertThat(properties.getGeminiModel()).isEqualTo("gemini-2.5-flash-native-audio-latest");
        assertThat(properties.getSystemPrompt()).contains("English, Bangla, and Korean");
        assertThat(properties.getMaxSessionsPerUser()).isEqualTo(1);
        assertThat(properties.getMaxSessionDurationSeconds()).isEqualTo(600);
        assertThat(properties.getMaxDailyMinutesPerUser()).isEqualTo(30);
        assertThat(properties.getMaxGlobalSessions()).isEqualTo(50);
        assertThat(properties.getGeminiApiKey()).isNull();
    }

    @Test
    void validateWithKeySetDoesNotThrow() {
        VoiceProperties properties = new VoiceProperties();
        properties.setGeminiApiKey("AIzaSyTestKey");

        assertThatCode(properties::validate).doesNotThrowAnyException();
    }

    @Test
    void validateWithBlankKeyLogsWarnAndDoesNotThrow() {
        VoiceProperties properties = new VoiceProperties();
        properties.setGeminiApiKey("   ");

        Logger logger = (Logger) LoggerFactory.getLogger(VoiceProperties.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            assertThatCode(properties::validate).doesNotThrowAnyException();
            assertThat(appender.list)
                    .anyMatch(event ->
                            event.getLevel() == Level.WARN
                                    && event.getFormattedMessage().contains("app.voice.gemini-api-key not set"));
        } finally {
            logger.detachAppender(appender);
        }
    }
}
