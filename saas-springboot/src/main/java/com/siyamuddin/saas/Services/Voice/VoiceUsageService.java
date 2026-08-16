package com.siyamuddin.saas.Services.Voice;

import com.siyamuddin.saas.Config.Properties.VoiceProperties;
import com.siyamuddin.saas.Services.AppSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory free-beta usage controls: daily minutes per user and global concurrency.
 * Caps prefer admin dashboard settings, then env/VoiceProperties defaults.
 */
@Service
@RequiredArgsConstructor
public class VoiceUsageService {

    private final VoiceProperties voiceProperties;
    private final AppSettingsService appSettingsService;

    private final ConcurrentHashMap<String, DailyUsage> dailyUsage = new ConcurrentHashMap<>();
    private final AtomicInteger globalActiveSessions = new AtomicInteger(0);

    public boolean tryAcquireGlobalSlot() {
        int max = maxGlobalSessions();
        while (true) {
            int current = globalActiveSessions.get();
            if (current >= max) {
                return false;
            }
            if (globalActiveSessions.compareAndSet(current, current + 1)) {
                return true;
            }
        }
    }

    public void releaseGlobalSlot() {
        globalActiveSessions.updateAndGet(v -> Math.max(0, v - 1));
    }

    public boolean hasDailyQuota(String username) {
        DailyUsage usage = getTodayUsage(username);
        return usage.secondsUsed() < maxDailyMinutesPerUser() * 60L;
    }

    public void recordSessionSeconds(String username, long seconds) {
        if (username == null || seconds <= 0) {
            return;
        }
        dailyUsage.compute(todayKey(username), (key, existing) -> {
            LocalDate today = LocalDate.now();
            if (existing == null || !existing.day().equals(today)) {
                return new DailyUsage(today, seconds);
            }
            return new DailyUsage(today, existing.secondsUsed() + seconds);
        });
    }

    public long remainingDailySeconds(String username) {
        long maxSeconds = maxDailyMinutesPerUser() * 60L;
        long used = getTodayUsage(username).secondsUsed();
        return Math.max(0, maxSeconds - used);
    }

    public int maxSessionDurationSeconds() {
        return intSetting("voice.maxSessionDurationSeconds", voiceProperties.getMaxSessionDurationSeconds());
    }

    public int maxSessionsPerUser() {
        return intSetting("voice.maxSessionsPerUser", voiceProperties.getMaxSessionsPerUser());
    }

    public int maxDailyMinutesPerUser() {
        return intSetting("voice.maxDailyMinutesPerUser", voiceProperties.getMaxDailyMinutesPerUser());
    }

    public int maxGlobalSessions() {
        return intSetting("voice.maxGlobalSessions", voiceProperties.getMaxGlobalSessions());
    }

    public String resolveGeminiApiKey() {
        String fromDb = appSettingsService.getSettingValue("voice.geminiApiKey", "");
        if (fromDb != null && !fromDb.isBlank()) {
            return fromDb;
        }
        return voiceProperties.getGeminiApiKey();
    }

    public String resolveGeminiModel() {
        return appSettingsService.getSettingValue(
                "voice.geminiModel",
                voiceProperties.getGeminiModel());
    }

    public String resolveSystemPrompt() {
        return appSettingsService.getSettingValue(
                "voice.systemPrompt",
                voiceProperties.getSystemPrompt());
    }

    private int intSetting(String key, int fallback) {
        try {
            return Integer.parseInt(appSettingsService.getSettingValue(key, String.valueOf(fallback)));
        } catch (Exception e) {
            return fallback;
        }
    }

    private DailyUsage getTodayUsage(String username) {
        LocalDate today = LocalDate.now();
        return dailyUsage.compute(todayKey(username), (key, existing) -> {
            if (existing == null || !existing.day().equals(today)) {
                return new DailyUsage(today, 0);
            }
            return existing;
        });
    }

    private static String todayKey(String username) {
        return LocalDate.now() + ":" + username;
    }

    record DailyUsage(LocalDate day, long secondsUsed) {
    }
}
