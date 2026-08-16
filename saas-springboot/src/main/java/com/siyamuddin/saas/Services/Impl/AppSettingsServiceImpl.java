package com.siyamuddin.saas.Services.Impl;

import com.siyamuddin.saas.Entity.AppSetting;
import com.siyamuddin.saas.Entity.User;
import com.siyamuddin.saas.Payloads.Settings.*;
import com.siyamuddin.saas.Repository.AppSettingRepo;
import com.siyamuddin.saas.Services.AppSettingsService;
import com.siyamuddin.saas.Services.AuditService;
import lombok.extern.slf4j.Slf4j;
import org.jasypt.util.text.BasicTextEncryptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.refresh.ContextRefresher;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class AppSettingsServiceImpl implements AppSettingsService {

    private final AppSettingRepo appSettingRepo;
    private final AuditService auditService;
    private final ContextRefresher contextRefresher;
    private final String encryptionKey;

    // In-memory cache for performance
    private final Map<String, String> settingsCache = new ConcurrentHashMap<>();

    private static final String MASKED_VALUE = "********";

    public AppSettingsServiceImpl(
            AppSettingRepo appSettingRepo,
            AuditService auditService,
            @Autowired(required = false) ContextRefresher contextRefresher,
            @Value("${jasypt.encryptor.password:default-encryption-key}") String encryptionKey) {
        this.appSettingRepo = appSettingRepo;
        this.auditService = auditService;
        this.contextRefresher = contextRefresher;
        this.encryptionKey = encryptionKey;
    }

    @Override
    public AllSettingsResponse getAllSettings() {
        refreshCacheIfEmpty();
        
        AllSettingsResponse response = new AllSettingsResponse();
        response.setEmail(mapToEmailSettings());
        response.setSecurity(mapToSecuritySettings());
        response.setRateLimits(mapToRateLimitSettings());
        response.setFileStorage(mapToFileStorageSettings());
        response.setOauth(mapToOAuthSettings());
        response.setVoice(mapToVoiceSettings());
        
        return response;
    }

    @Override
    public List<AppSettingDto> getSettingsByCategory(AppSetting.SettingCategory category) {
        List<AppSetting> settings = appSettingRepo.findBySettingCategoryOrderBySettingKey(category);
        return settings.stream()
                .map(this::maskSensitiveValue)
                .toList();
    }

    @Override
    public String getSettingValue(String key, String defaultValue) {
        if (settingsCache.isEmpty()) {
            refreshCacheIfEmpty();
        }
        return settingsCache.getOrDefault(key, defaultValue);
    }

    @Override
    @Transactional
    public EmailSettingsDto updateEmailSettings(EmailSettingsDto settings, Integer adminUserId) {
        log.info("Updating email settings by admin user: {}", adminUserId);
        
        updateSetting("email.host", settings.getHost(), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.port", String.valueOf(settings.getPort()), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.username", settings.getUsername(), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        
        // Only update password if it's not masked
        if (settings.getPassword() != null && !settings.getPassword().equals(MASKED_VALUE)) {
            updateSetting("email.password", settings.getPassword(), AppSetting.SettingCategory.EMAIL, adminUserId, true);
        }
        
        updateSetting("email.from", settings.getFrom(), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.fromName", settings.getFromName(), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.enabled", String.valueOf(settings.getEnabled()), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.verificationBaseUrl", settings.getVerificationBaseUrl(), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.passwordResetBaseUrl", settings.getPasswordResetBaseUrl(), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.smtpAuth", String.valueOf(settings.getSmtpAuth()), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        updateSetting("email.smtpTls", String.valueOf(settings.getSmtpTls()), AppSetting.SettingCategory.EMAIL, adminUserId, false);
        
        refreshConfiguration();
        auditAdminAction(adminUserId, "UPDATE_EMAIL_SETTINGS");
        
        return mapToEmailSettings();
    }

    @Override
    @Transactional
    public SecuritySettingsDto updateSecuritySettings(SecuritySettingsDto settings, Integer adminUserId) {
        log.info("Updating security settings by admin user: {}", adminUserId);
        
        updateSetting("security.maxFailedLoginAttempts", String.valueOf(settings.getMaxFailedLoginAttempts()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.accountLockoutDuration", String.valueOf(settings.getAccountLockoutDuration()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordMinLength", String.valueOf(settings.getPasswordMinLength()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordMaxLength", String.valueOf(settings.getPasswordMaxLength()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordRequireUppercase", String.valueOf(settings.getPasswordRequireUppercase()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordRequireLowercase", String.valueOf(settings.getPasswordRequireLowercase()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordRequireDigit", String.valueOf(settings.getPasswordRequireDigit()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordRequireSpecialChar", String.valueOf(settings.getPasswordRequireSpecialChar()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.sessionTimeout", String.valueOf(settings.getSessionTimeout()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.requireEmailVerification", String.valueOf(settings.getRequireEmailVerification()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.emailVerificationTokenExpiry", String.valueOf(settings.getEmailVerificationTokenExpiry()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        updateSetting("security.passwordResetTokenExpiry", String.valueOf(settings.getPasswordResetTokenExpiry()), AppSetting.SettingCategory.SECURITY, adminUserId, false);
        
        refreshConfiguration();
        auditAdminAction(adminUserId, "UPDATE_SECURITY_SETTINGS");
        
        return mapToSecuritySettings();
    }

    @Override
    @Transactional
    public RateLimitSettingsDto updateRateLimitSettings(RateLimitSettingsDto settings, Integer adminUserId) {
        log.info("Updating rate limit settings by admin user: {}", adminUserId);
        
        updateSetting("rateLimit.login.requests", String.valueOf(settings.getLoginRequests()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.login.duration", String.valueOf(settings.getLoginDuration()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.registration.requests", String.valueOf(settings.getRegistrationRequests()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.registration.duration", String.valueOf(settings.getRegistrationDuration()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.passwordChange.requests", String.valueOf(settings.getPasswordChangeRequests()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.passwordChange.duration", String.valueOf(settings.getPasswordChangeDuration()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.general.requests", String.valueOf(settings.getGeneralRequests()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        updateSetting("rateLimit.general.duration", String.valueOf(settings.getGeneralDuration()), AppSetting.SettingCategory.RATE_LIMIT, adminUserId, false);
        
        refreshConfiguration();
        auditAdminAction(adminUserId, "UPDATE_RATE_LIMIT_SETTINGS");
        
        return mapToRateLimitSettings();
    }

    @Override
    @Transactional
    public FileStorageSettingsDto updateFileStorageSettings(FileStorageSettingsDto settings, Integer adminUserId) {
        log.info("Updating file storage settings by admin user: {}", adminUserId);
        
        updateSetting("fileStorage.mode", settings.getMode(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.maxFileSize", String.valueOf(settings.getMaxFileSize()), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.allowedImageTypes", settings.getAllowedImageTypes(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.localBasePath", settings.getLocalBasePath(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.localPublicPrefix", settings.getLocalPublicPrefix(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.s3BucketName", settings.getS3BucketName(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.s3Region", settings.getS3Region(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        
        // Only update S3 credentials if not masked
        if (settings.getS3AccessKey() != null && !settings.getS3AccessKey().equals(MASKED_VALUE)) {
            updateSetting("fileStorage.s3AccessKey", settings.getS3AccessKey(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, true);
        }
        if (settings.getS3SecretKey() != null && !settings.getS3SecretKey().equals(MASKED_VALUE)) {
            updateSetting("fileStorage.s3SecretKey", settings.getS3SecretKey(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, true);
        }
        
        updateSetting("fileStorage.s3PublicBaseUrl", settings.getS3PublicBaseUrl(), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        updateSetting("fileStorage.cleanupEnabled", String.valueOf(settings.getCleanupEnabled()), AppSetting.SettingCategory.FILE_STORAGE, adminUserId, false);
        
        refreshConfiguration();
        auditAdminAction(adminUserId, "UPDATE_FILE_STORAGE_SETTINGS");
        
        return mapToFileStorageSettings();
    }

    @Override
    @Transactional
    public OAuthSettingsDto updateOAuthSettings(OAuthSettingsDto settings, Integer adminUserId) {
        log.info("Updating OAuth settings by admin user: {}", adminUserId);
        
        // Validate if OAuth is being enabled
        settings.validate();
        
        updateSetting("oauth.google.enabled", String.valueOf(settings.getEnabled()), AppSetting.SettingCategory.OAUTH, adminUserId, false);
        updateSetting("oauth.google.clientId", settings.getClientId(), AppSetting.SettingCategory.OAUTH, adminUserId, false);
        
        // Only update client secret if not masked
        if (settings.getClientSecret() != null && !settings.getClientSecret().equals(MASKED_VALUE) && !settings.getClientSecret().startsWith("***")) {
            updateSetting("oauth.google.clientSecret", settings.getClientSecret(), AppSetting.SettingCategory.OAUTH, adminUserId, true);
        }
        
        updateSetting("oauth.google.redirectUri", settings.getRedirectUri(), AppSetting.SettingCategory.OAUTH, adminUserId, false);
        updateSetting("oauth.google.authorizedDomains", settings.getAuthorizedDomains() != null ? settings.getAuthorizedDomains() : "", AppSetting.SettingCategory.OAUTH, adminUserId, false);
        updateSetting("oauth.google.scopes", settings.getScopes(), AppSetting.SettingCategory.OAUTH, adminUserId, false);
        
        refreshConfiguration();
        auditAdminAction(adminUserId, "UPDATE_OAUTH_SETTINGS");
        
        return mapToOAuthSettings();
    }

    @Override
    @Transactional
    public VoiceSettingsDto updateVoiceSettings(VoiceSettingsDto settings, Integer adminUserId) {
        log.info("Updating voice settings by admin user: {}", adminUserId);

        if (settings.getGeminiApiKey() != null
                && !settings.getGeminiApiKey().equals(MASKED_VALUE)
                && !settings.getGeminiApiKey().isBlank()) {
            updateSetting("voice.geminiApiKey", settings.getGeminiApiKey(), AppSetting.SettingCategory.VOICE, adminUserId, true);
        }

        updateSetting("voice.geminiModel", settings.getGeminiModel(), AppSetting.SettingCategory.VOICE, adminUserId, false);
        updateSetting("voice.systemPrompt", settings.getSystemPrompt(), AppSetting.SettingCategory.VOICE, adminUserId, false);
        updateSetting("voice.maxSessionsPerUser", String.valueOf(settings.getMaxSessionsPerUser()), AppSetting.SettingCategory.VOICE, adminUserId, false);
        updateSetting("voice.maxSessionDurationSeconds", String.valueOf(settings.getMaxSessionDurationSeconds()), AppSetting.SettingCategory.VOICE, adminUserId, false);
        updateSetting("voice.maxDailyMinutesPerUser", String.valueOf(settings.getMaxDailyMinutesPerUser()), AppSetting.SettingCategory.VOICE, adminUserId, false);
        updateSetting("voice.maxGlobalSessions", String.valueOf(settings.getMaxGlobalSessions()), AppSetting.SettingCategory.VOICE, adminUserId, false);

        refreshConfiguration();
        auditAdminAction(adminUserId, "UPDATE_VOICE_SETTINGS");

        return mapToVoiceSettings();
    }

    @Override
    public boolean testEmailConnection(EmailSettingsDto settings) {
        try {
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(settings.getHost());
            mailSender.setPort(settings.getPort());
            mailSender.setUsername(settings.getUsername());
            
            // Decrypt password if it's not masked
            String password = settings.getPassword();
            if (!MASKED_VALUE.equals(password)) {
                mailSender.setPassword(password);
            }
            
            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.smtp.auth", settings.getSmtpAuth());
            props.put("mail.smtp.starttls.enable", settings.getSmtpTls());
            props.put("mail.smtp.timeout", "5000");
            props.put("mail.smtp.connectiontimeout", "5000");
            
            mailSender.testConnection();
            log.info("Email connection test successful");
            return true;
        } catch (Exception e) {
            log.error("Email connection test failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean testOAuthConfiguration(OAuthSettingsDto settings) {
        try {
            // Validate OAuth settings
            settings.validate();
            
            // Basic validation checks
            if (settings.getEnabled()) {
                if (settings.getClientId() == null || settings.getClientId().trim().isEmpty()) {
                    return false;
                }
                if (!settings.getRedirectUri().startsWith("http")) {
                    return false;
                }
            }
            
            log.info("OAuth configuration validation successful");
            return true;
        } catch (Exception e) {
            log.error("OAuth configuration validation failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    @Transactional
    public void resetToDefaults(AppSetting.SettingCategory category, Integer adminUserId) {
        log.info("Resetting category {} to defaults by admin user: {}", category, adminUserId);
        
        // Delete all settings in category - they'll be re-seeded from migration
        List<AppSetting> settings = appSettingRepo.findBySettingCategoryOrderBySettingKey(category);
        appSettingRepo.deleteAll(settings);
        
        refreshCache();
        refreshConfiguration();
        
        auditAdminAction(adminUserId, "RESET_SETTINGS_" + category.name());
    }

    @Override
    public void refreshConfiguration() {
        if (contextRefresher != null) {
            try {
                contextRefresher.refresh();
                log.info("Configuration refreshed successfully");
            } catch (Exception e) {
                log.error("Failed to refresh configuration: {}", e.getMessage());
            }
        }
        refreshCache();
    }

    @Override
    public Map<String, String> getSettingsAsMap(AppSetting.SettingCategory category) {
        List<AppSetting> settings = appSettingRepo.findBySettingCategoryOrderBySettingKey(category);
        Map<String, String> map = new HashMap<>();
        
        for (AppSetting setting : settings) {
            String value = setting.getIsSensitive() ? decrypt(setting.getSettingValue()) : setting.getSettingValue();
            map.put(setting.getSettingKey(), value);
        }
        
        return map;
    }

    // Private helper methods

    private void updateSetting(String key, String value, AppSetting.SettingCategory category, Integer adminUserId, boolean isSensitive) {
        AppSetting setting = appSettingRepo.findBySettingKey(key)
                .orElse(new AppSetting());
        
        setting.setSettingKey(key);
        setting.setSettingValue(isSensitive ? encrypt(value) : value);
        setting.setSettingCategory(category);
        setting.setUpdatedBy(adminUserId);
        setting.setIsSensitive(isSensitive);
        
        appSettingRepo.save(setting);
        
        // Update cache
        settingsCache.put(key, value);
    }

    private void refreshCacheIfEmpty() {
        if (settingsCache.isEmpty()) {
            refreshCache();
        }
    }

    private void refreshCache() {
        settingsCache.clear();
        List<AppSetting> allSettings = appSettingRepo.findAll();
        
        for (AppSetting setting : allSettings) {
            String value = setting.getIsSensitive() ? decrypt(setting.getSettingValue()) : setting.getSettingValue();
            settingsCache.put(setting.getSettingKey(), value);
        }
        
        log.info("Settings cache refreshed with {} entries", settingsCache.size());
    }

    private String encrypt(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        try {
            BasicTextEncryptor encryptor = new BasicTextEncryptor();
            encryptor.setPassword(encryptionKey);
            return encryptor.encrypt(value);
        } catch (Exception e) {
            log.error("Encryption failed: {}", e.getMessage());
            return value;
        }
    }

    private String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isEmpty()) {
            return encryptedValue;
        }
        try {
            BasicTextEncryptor encryptor = new BasicTextEncryptor();
            encryptor.setPassword(encryptionKey);
            return encryptor.decrypt(encryptedValue);
        } catch (Exception e) {
            log.error("Decryption failed: {}", e.getMessage());
            return encryptedValue;
        }
    }

    private AppSettingDto maskSensitiveValue(AppSetting setting) {
        AppSettingDto dto = new AppSettingDto();
        dto.setId(setting.getId());
        dto.setSettingKey(setting.getSettingKey());
        dto.setSettingValue(setting.getIsSensitive() ? MASKED_VALUE : setting.getSettingValue());
        dto.setSettingCategory(setting.getSettingCategory().name());
        dto.setDescription(setting.getDescription());
        dto.setDataType(setting.getDataType().name());
        dto.setIsSensitive(setting.getIsSensitive());
        dto.setUpdatedAt(setting.getUpdatedAt() != null ? setting.getUpdatedAt().toString() : null);
        dto.setUpdatedBy(setting.getUpdatedBy());
        return dto;
    }

    private EmailSettingsDto mapToEmailSettings() {
        EmailSettingsDto dto = new EmailSettingsDto();
        dto.setHost(getSettingValue("email.host", "smtp.gmail.com"));
        dto.setPort(Integer.parseInt(getSettingValue("email.port", "587")));
        dto.setUsername(getSettingValue("email.username", ""));
        dto.setPassword(MASKED_VALUE); // Always masked
        dto.setFrom(getSettingValue("email.from", "noreply@example.com"));
        dto.setFromName(getSettingValue("email.fromName", "SAAS Starter"));
        dto.setEnabled(Boolean.parseBoolean(getSettingValue("email.enabled", "true")));
        dto.setVerificationBaseUrl(getSettingValue("email.verificationBaseUrl", "http://localhost:3000/verify-email"));
        dto.setPasswordResetBaseUrl(getSettingValue("email.passwordResetBaseUrl", "http://localhost:3000/reset-password"));
        dto.setSmtpAuth(Boolean.parseBoolean(getSettingValue("email.smtpAuth", "true")));
        dto.setSmtpTls(Boolean.parseBoolean(getSettingValue("email.smtpTls", "true")));
        return dto;
    }

    private SecuritySettingsDto mapToSecuritySettings() {
        SecuritySettingsDto dto = new SecuritySettingsDto();
        dto.setMaxFailedLoginAttempts(Integer.parseInt(getSettingValue("security.maxFailedLoginAttempts", "5")));
        dto.setAccountLockoutDuration(Integer.parseInt(getSettingValue("security.accountLockoutDuration", "30")));
        dto.setPasswordMinLength(Integer.parseInt(getSettingValue("security.passwordMinLength", "8")));
        dto.setPasswordMaxLength(Integer.parseInt(getSettingValue("security.passwordMaxLength", "128")));
        dto.setPasswordRequireUppercase(Boolean.parseBoolean(getSettingValue("security.passwordRequireUppercase", "true")));
        dto.setPasswordRequireLowercase(Boolean.parseBoolean(getSettingValue("security.passwordRequireLowercase", "true")));
        dto.setPasswordRequireDigit(Boolean.parseBoolean(getSettingValue("security.passwordRequireDigit", "true")));
        dto.setPasswordRequireSpecialChar(Boolean.parseBoolean(getSettingValue("security.passwordRequireSpecialChar", "true")));
        dto.setSessionTimeout(Integer.parseInt(getSettingValue("security.sessionTimeout", "30")));
        dto.setRequireEmailVerification(Boolean.parseBoolean(getSettingValue("security.requireEmailVerification", "false")));
        dto.setEmailVerificationTokenExpiry(Integer.parseInt(getSettingValue("security.emailVerificationTokenExpiry", "24")));
        dto.setPasswordResetTokenExpiry(Integer.parseInt(getSettingValue("security.passwordResetTokenExpiry", "1")));
        return dto;
    }

    private RateLimitSettingsDto mapToRateLimitSettings() {
        RateLimitSettingsDto dto = new RateLimitSettingsDto();
        dto.setLoginRequests(Integer.parseInt(getSettingValue("rateLimit.login.requests", "10")));
        dto.setLoginDuration(Integer.parseInt(getSettingValue("rateLimit.login.duration", "1")));
        dto.setRegistrationRequests(Integer.parseInt(getSettingValue("rateLimit.registration.requests", "10")));
        dto.setRegistrationDuration(Integer.parseInt(getSettingValue("rateLimit.registration.duration", "1")));
        dto.setPasswordChangeRequests(Integer.parseInt(getSettingValue("rateLimit.passwordChange.requests", "5")));
        dto.setPasswordChangeDuration(Integer.parseInt(getSettingValue("rateLimit.passwordChange.duration", "1")));
        dto.setGeneralRequests(Integer.parseInt(getSettingValue("rateLimit.general.requests", "50000")));
        dto.setGeneralDuration(Integer.parseInt(getSettingValue("rateLimit.general.duration", "1")));
        return dto;
    }

    private FileStorageSettingsDto mapToFileStorageSettings() {
        FileStorageSettingsDto dto = new FileStorageSettingsDto();
        dto.setMode(getSettingValue("fileStorage.mode", "local"));
        dto.setMaxFileSize(Long.parseLong(getSettingValue("fileStorage.maxFileSize", "5242880")));
        dto.setAllowedImageTypes(getSettingValue("fileStorage.allowedImageTypes", "image/jpeg,image/jpg,image/png,image/gif,image/webp"));
        dto.setLocalBasePath(getSettingValue("fileStorage.localBasePath", "uploads"));
        dto.setLocalPublicPrefix(getSettingValue("fileStorage.localPublicPrefix", "/uploads"));
        dto.setS3BucketName(getSettingValue("fileStorage.s3BucketName", ""));
        dto.setS3Region(getSettingValue("fileStorage.s3Region", ""));
        dto.setS3AccessKey(MASKED_VALUE); // Always masked
        dto.setS3SecretKey(MASKED_VALUE); // Always masked
        dto.setS3PublicBaseUrl(getSettingValue("fileStorage.s3PublicBaseUrl", ""));
        dto.setCleanupEnabled(Boolean.parseBoolean(getSettingValue("fileStorage.cleanupEnabled", "true")));
        return dto;
    }

    private OAuthSettingsDto mapToOAuthSettings() {
        OAuthSettingsDto dto = new OAuthSettingsDto();
        dto.setEnabled(Boolean.parseBoolean(getSettingValue("oauth.google.enabled", "false")));
        dto.setClientId(getSettingValue("oauth.google.clientId", ""));
        dto.setClientSecret(MASKED_VALUE); // Always masked
        dto.setRedirectUri(getSettingValue("oauth.google.redirectUri", "http://localhost:3000/oauth/callback"));
        dto.setAuthorizedDomains(getSettingValue("oauth.google.authorizedDomains", ""));
        dto.setScopes(getSettingValue("oauth.google.scopes", "openid,profile,email"));
        return dto;
    }

    private VoiceSettingsDto mapToVoiceSettings() {
        VoiceSettingsDto dto = new VoiceSettingsDto();
        String storedKey = getSettingValue("voice.geminiApiKey", "");
        dto.setGeminiApiKey(storedKey == null || storedKey.isBlank() ? "" : MASKED_VALUE);
        dto.setGeminiModel(getSettingValue("voice.geminiModel", "gemini-2.5-flash-native-audio-latest"));
        dto.setSystemPrompt(getSettingValue(
                "voice.systemPrompt",
                "You are a helpful AI assistant. You speak English, Bangla, and Korean naturally and switch to match the user's language. Be concise and conversational."));
        dto.setMaxSessionsPerUser(Integer.parseInt(getSettingValue("voice.maxSessionsPerUser", "1")));
        dto.setMaxSessionDurationSeconds(Integer.parseInt(getSettingValue("voice.maxSessionDurationSeconds", "600")));
        dto.setMaxDailyMinutesPerUser(Integer.parseInt(getSettingValue("voice.maxDailyMinutesPerUser", "30")));
        dto.setMaxGlobalSessions(Integer.parseInt(getSettingValue("voice.maxGlobalSessions", "50")));
        return dto;
    }

    private void auditAdminAction(Integer adminUserId, String action) {
        try {
            User adminUser = new User();
            adminUser.setId(adminUserId);
            auditService.logSecurityEvent(adminUser, action, true);
        } catch (Exception e) {
            log.warn("Failed to audit admin action: {}", e.getMessage());
        }
    }
}
