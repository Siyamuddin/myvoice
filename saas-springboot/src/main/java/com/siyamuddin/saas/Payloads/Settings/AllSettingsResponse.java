package com.siyamuddin.saas.Payloads.Settings;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AllSettingsResponse {
    private EmailSettingsDto email;
    private SecuritySettingsDto security;
    private RateLimitSettingsDto rateLimits;
    private FileStorageSettingsDto fileStorage;
    private OAuthSettingsDto oauth;
    private VoiceSettingsDto voice;
}

