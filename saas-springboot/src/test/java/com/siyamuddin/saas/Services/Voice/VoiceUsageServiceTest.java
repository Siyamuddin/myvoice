package com.siyamuddin.saas.Services.Voice;

import com.siyamuddin.saas.Config.Properties.VoiceProperties;
import com.siyamuddin.saas.Services.AppSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VoiceUsageServiceTest {

    @Mock
    private AppSettingsService appSettingsService;

    private VoiceUsageService usageService;

    @BeforeEach
    void setUp() {
        VoiceProperties properties = new VoiceProperties();
        properties.setMaxDailyMinutesPerUser(1);
        properties.setMaxGlobalSessions(2);
        properties.setMaxSessionDurationSeconds(60);
        usageService = new VoiceUsageService(properties, appSettingsService);

        lenient().when(appSettingsService.getSettingValue(eq("voice.maxDailyMinutesPerUser"), anyString())).thenReturn("1");
        lenient().when(appSettingsService.getSettingValue(eq("voice.maxGlobalSessions"), anyString())).thenReturn("2");
        lenient().when(appSettingsService.getSettingValue(eq("voice.maxSessionDurationSeconds"), anyString())).thenReturn("60");
    }

    @Test
    void dailyQuotaExhaustsAfterRecordedSeconds() {
        assertThat(usageService.hasDailyQuota("a@test.com")).isTrue();
        usageService.recordSessionSeconds("a@test.com", 60);
        assertThat(usageService.hasDailyQuota("a@test.com")).isFalse();
        assertThat(usageService.remainingDailySeconds("a@test.com")).isZero();
    }

    @Test
    void globalSlotsAreBounded() {
        assertThat(usageService.tryAcquireGlobalSlot()).isTrue();
        assertThat(usageService.tryAcquireGlobalSlot()).isTrue();
        assertThat(usageService.tryAcquireGlobalSlot()).isFalse();
        usageService.releaseGlobalSlot();
        assertThat(usageService.tryAcquireGlobalSlot()).isTrue();
    }
}
