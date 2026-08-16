package com.siyamuddin.saas.Services;

import com.siyamuddin.saas.Entity.AppSetting;
import com.siyamuddin.saas.Payloads.Settings.*;

import java.util.List;
import java.util.Map;

public interface AppSettingsService {
    
    // Get all settings
    AllSettingsResponse getAllSettings();
    
    // Get settings by category
    List<AppSettingDto> getSettingsByCategory(AppSetting.SettingCategory category);
    
    // Get single setting
    String getSettingValue(String key, String defaultValue);
    
    // Update settings by category
    EmailSettingsDto updateEmailSettings(EmailSettingsDto settings, Integer adminUserId);
    SecuritySettingsDto updateSecuritySettings(SecuritySettingsDto settings, Integer adminUserId);
    RateLimitSettingsDto updateRateLimitSettings(RateLimitSettingsDto settings, Integer adminUserId);
    FileStorageSettingsDto updateFileStorageSettings(FileStorageSettingsDto settings, Integer adminUserId);
    OAuthSettingsDto updateOAuthSettings(OAuthSettingsDto settings, Integer adminUserId);
    VoiceSettingsDto updateVoiceSettings(VoiceSettingsDto settings, Integer adminUserId);
    
    // Test connections
    boolean testEmailConnection(EmailSettingsDto settings);
    boolean testOAuthConfiguration(OAuthSettingsDto settings);
    
    // Reset to defaults
    void resetToDefaults(AppSetting.SettingCategory category, Integer adminUserId);
    
    // Refresh configuration
    void refreshConfiguration();
    
    // Get grouped settings as map
    Map<String, String> getSettingsAsMap(AppSetting.SettingCategory category);
}

