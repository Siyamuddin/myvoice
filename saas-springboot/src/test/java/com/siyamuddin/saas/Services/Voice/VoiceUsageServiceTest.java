package com.siyamuddin.saas.Services.Voice;

import com.siyamuddin.saas.Config.Properties.VoiceProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VoiceUsageServiceTest {

    private VoiceUsageService usageService;

    @BeforeEach
    void setUp() {
        VoiceProperties properties = new VoiceProperties();
        properties.setMaxDailyMinutesPerUser(1);
        properties.setMaxGlobalSessions(2);
        properties.setMaxSessionDurationSeconds(60);
        usageService = new VoiceUsageService(properties);
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
