package com.siyamuddin.saas.Payloads.Settings;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoiceSettingsDto {
    @NotBlank
    private String geminiApiKey;

    @NotBlank
    private String geminiModel;

    @NotBlank
    private String systemPrompt;

    @NotNull
    @Min(1)
    private Integer maxSessionsPerUser;

    @NotNull
    @Min(30)
    private Integer maxSessionDurationSeconds;

    @NotNull
    @Min(1)
    private Integer maxDailyMinutesPerUser;

    @NotNull
    @Min(1)
    private Integer maxGlobalSessions;
}
