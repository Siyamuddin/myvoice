package com.siyamuddin.saas.Config;

import com.siyamuddin.saas.Entity.AppSetting;
import com.siyamuddin.saas.Entity.Role;
import com.siyamuddin.saas.Repository.AppSettingRepo;
import com.siyamuddin.saas.Repository.RoleRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Data initializer that seeds essential data on application startup.
 * Replaces Flyway migration functionality for initial data seeding.
 * This component is idempotent and safe to run multiple times.
 */
@Slf4j
@Component
@Order(1) // Run after Hibernate creates tables but before other components
public class DataInitializer implements ApplicationRunner {

    private final RoleRepo roleRepo;
    private final AppSettingRepo appSettingRepo;

    public DataInitializer(RoleRepo roleRepo, AppSettingRepo appSettingRepo) {
        this.roleRepo = roleRepo;
        this.appSettingRepo = appSettingRepo;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Starting data initialization...");

        try {
            initializeRoles();
            initializeAppSettings();
            log.info("Data initialization completed successfully");
        } catch (Exception e) {
            log.error("Error during data initialization: {}", e.getMessage(), e);
            // Don't rethrow — allow startup to continue if DB is not ready.
            // Avoid marking the outer transaction rollback-only by not using @Transactional on run.
        }
    }

    /**
     * Initialize roles (ROLE_ADMIN and ROLE_NORMAL)
     */
    private void initializeRoles() {
        log.info("Initializing roles...");
        
        // Initialize ROLE_ADMIN (id=1)
        Optional<Role> adminRole = roleRepo.findById(1);
        if (adminRole.isEmpty()) {
            Role role = new Role();
            role.setId(1);
            role.setName("ROLE_ADMIN");
            roleRepo.save(role);
            log.info("Created role: ROLE_ADMIN (id=1)");
        } else {
            log.debug("Role ROLE_ADMIN already exists");
        }

        // Initialize ROLE_NORMAL (id=2)
        Optional<Role> normalRole = roleRepo.findById(2);
        if (normalRole.isEmpty()) {
            Role role = new Role();
            role.setId(2);
            role.setName("ROLE_NORMAL");
            roleRepo.save(role);
            log.info("Created role: ROLE_NORMAL (id=2)");
        } else {
            log.debug("Role ROLE_NORMAL already exists");
        }
    }

    /**
     * Initialize app settings from all categories
     */
    private void initializeAppSettings() {
        log.info("Initializing app settings...");
        
        List<AppSetting> settings = new ArrayList<>();
        
        // Email Settings
        settings.add(createSetting("email.host", "smtp.gmail.com", AppSetting.SettingCategory.EMAIL, 
            "SMTP server hostname", AppSetting.DataType.STRING, false));
        settings.add(createSetting("email.port", "587", AppSetting.SettingCategory.EMAIL, 
            "SMTP server port", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("email.username", "", AppSetting.SettingCategory.EMAIL, 
            "SMTP username (email address)", AppSetting.DataType.STRING, false));
        settings.add(createSetting("email.password", "", AppSetting.SettingCategory.EMAIL, 
            "SMTP password (encrypted)", AppSetting.DataType.STRING, true));
        settings.add(createSetting("email.from", "noreply@example.com", AppSetting.SettingCategory.EMAIL, 
            "From email address", AppSetting.DataType.STRING, false));
        settings.add(createSetting("email.fromName", "SAAS Starter", AppSetting.SettingCategory.EMAIL, 
            "From name displayed in emails", AppSetting.DataType.STRING, false));
        settings.add(createSetting("email.enabled", "true", AppSetting.SettingCategory.EMAIL, 
            "Enable/disable email functionality", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("email.verificationBaseUrl", "http://localhost:3000/verify-email", 
            AppSetting.SettingCategory.EMAIL, "Email verification link base URL", AppSetting.DataType.STRING, false));
        settings.add(createSetting("email.passwordResetBaseUrl", "http://localhost:3000/reset-password", 
            AppSetting.SettingCategory.EMAIL, "Password reset link base URL", AppSetting.DataType.STRING, false));
        settings.add(createSetting("email.smtpAuth", "true", AppSetting.SettingCategory.EMAIL, 
            "Enable SMTP authentication", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("email.smtpTls", "true", AppSetting.SettingCategory.EMAIL, 
            "Enable SMTP TLS", AppSetting.DataType.BOOLEAN, false));

        // Security Settings
        settings.add(createSetting("security.maxFailedLoginAttempts", "5", AppSetting.SettingCategory.SECURITY, 
            "Maximum failed login attempts before lockout", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("security.accountLockoutDuration", "30", AppSetting.SettingCategory.SECURITY, 
            "Account lockout duration in minutes", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("security.passwordMinLength", "8", AppSetting.SettingCategory.SECURITY, 
            "Minimum password length", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("security.passwordMaxLength", "128", AppSetting.SettingCategory.SECURITY, 
            "Maximum password length", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("security.passwordRequireUppercase", "true", AppSetting.SettingCategory.SECURITY, 
            "Require uppercase letter in password", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("security.passwordRequireLowercase", "true", AppSetting.SettingCategory.SECURITY, 
            "Require lowercase letter in password", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("security.passwordRequireDigit", "true", AppSetting.SettingCategory.SECURITY, 
            "Require digit in password", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("security.passwordRequireSpecialChar", "true", AppSetting.SettingCategory.SECURITY, 
            "Require special character in password", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("security.sessionTimeout", "30", AppSetting.SettingCategory.SECURITY, 
            "Session timeout in minutes", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("security.requireEmailVerification", "false", AppSetting.SettingCategory.SECURITY, 
            "Require email verification before login", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("security.emailVerificationTokenExpiry", "24", AppSetting.SettingCategory.SECURITY, 
            "Email verification token expiry in hours", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("security.passwordResetTokenExpiry", "1", AppSetting.SettingCategory.SECURITY, 
            "Password reset token expiry in hours", AppSetting.DataType.INTEGER, false));

        // Rate Limit Settings
        settings.add(createSetting("rateLimit.login.requests", "10", AppSetting.SettingCategory.RATE_LIMIT, 
            "Maximum login attempts per duration", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.login.duration", "1", AppSetting.SettingCategory.RATE_LIMIT, 
            "Login rate limit duration in hours", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.registration.requests", "10", AppSetting.SettingCategory.RATE_LIMIT, 
            "Maximum registrations per duration", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.registration.duration", "1", AppSetting.SettingCategory.RATE_LIMIT, 
            "Registration rate limit duration in hours", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.passwordChange.requests", "5", AppSetting.SettingCategory.RATE_LIMIT, 
            "Maximum password changes per duration", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.passwordChange.duration", "1", AppSetting.SettingCategory.RATE_LIMIT, 
            "Password change rate limit duration in hours", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.general.requests", "50000", AppSetting.SettingCategory.RATE_LIMIT, 
            "General API rate limit requests", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("rateLimit.general.duration", "1", AppSetting.SettingCategory.RATE_LIMIT, 
            "General API rate limit duration in hours", AppSetting.DataType.INTEGER, false));

        // File Storage Settings
        settings.add(createSetting("fileStorage.mode", "local", AppSetting.SettingCategory.FILE_STORAGE, 
            "Storage mode: local or s3", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.maxFileSize", "5242880", AppSetting.SettingCategory.FILE_STORAGE, 
            "Maximum file size in bytes (default 5MB)", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("fileStorage.allowedImageTypes", "image/jpeg,image/jpg,image/png,image/gif,image/webp", 
            AppSetting.SettingCategory.FILE_STORAGE, "Comma-separated allowed image MIME types", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.localBasePath", "uploads", AppSetting.SettingCategory.FILE_STORAGE, 
            "Local storage base path", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.localPublicPrefix", "/uploads", AppSetting.SettingCategory.FILE_STORAGE, 
            "Public URI prefix for local files", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.s3BucketName", "", AppSetting.SettingCategory.FILE_STORAGE, 
            "AWS S3 bucket name", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.s3Region", "", AppSetting.SettingCategory.FILE_STORAGE, 
            "AWS S3 region", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.s3AccessKey", "", AppSetting.SettingCategory.FILE_STORAGE, 
            "AWS S3 access key (encrypted)", AppSetting.DataType.STRING, true));
        settings.add(createSetting("fileStorage.s3SecretKey", "", AppSetting.SettingCategory.FILE_STORAGE, 
            "AWS S3 secret key (encrypted)", AppSetting.DataType.STRING, true));
        settings.add(createSetting("fileStorage.s3PublicBaseUrl", "", AppSetting.SettingCategory.FILE_STORAGE, 
            "S3 public base URL", AppSetting.DataType.STRING, false));
        settings.add(createSetting("fileStorage.cleanupEnabled", "true", AppSetting.SettingCategory.FILE_STORAGE, 
            "Enable file cleanup on deletion", AppSetting.DataType.BOOLEAN, false));

        // OAuth Settings
        settings.add(createSetting("oauth.google.enabled", "false", AppSetting.SettingCategory.OAUTH, 
            "Enable Google OAuth login", AppSetting.DataType.BOOLEAN, false));
        settings.add(createSetting("oauth.google.clientId", "", AppSetting.SettingCategory.OAUTH, 
            "Google OAuth Client ID", AppSetting.DataType.STRING, false));
        settings.add(createSetting("oauth.google.clientSecret", "", AppSetting.SettingCategory.OAUTH, 
            "Google OAuth Client Secret (encrypted)", AppSetting.DataType.STRING, true));
        settings.add(createSetting("oauth.google.redirectUri", "http://localhost:3000/oauth/callback", 
            AppSetting.SettingCategory.OAUTH, "OAuth redirect URI", AppSetting.DataType.STRING, false));
        settings.add(createSetting("oauth.google.authorizedDomains", "", AppSetting.SettingCategory.OAUTH, 
            "Comma-separated authorized email domains (empty = all allowed)", AppSetting.DataType.STRING, false));
        settings.add(createSetting("oauth.google.scopes", "openid,profile,email", AppSetting.SettingCategory.OAUTH, 
            "Comma-separated OAuth scopes", AppSetting.DataType.STRING, false));

        // Voice / free-beta settings
        settings.add(createSetting("voice.geminiApiKey", "", AppSetting.SettingCategory.VOICE,
            "Gemini Live API key (encrypted)", AppSetting.DataType.STRING, true));
        settings.add(createSetting("voice.geminiModel", "gemini-2.5-flash-native-audio-latest", AppSetting.SettingCategory.VOICE,
            "Gemini Live model id", AppSetting.DataType.STRING, false));
        settings.add(createSetting("voice.systemPrompt",
            "You are a helpful AI assistant. You speak English, Bangla, and Korean naturally and switch to match the user's language. Be concise and conversational.",
            AppSetting.SettingCategory.VOICE, "System prompt for the voice agent", AppSetting.DataType.STRING, false));
        settings.add(createSetting("voice.maxSessionsPerUser", "1", AppSetting.SettingCategory.VOICE,
            "Max concurrent voice sessions per user", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("voice.maxSessionDurationSeconds", "600", AppSetting.SettingCategory.VOICE,
            "Max seconds per voice session", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("voice.maxDailyMinutesPerUser", "30", AppSetting.SettingCategory.VOICE,
            "Max voice minutes per user per day", AppSetting.DataType.INTEGER, false));
        settings.add(createSetting("voice.maxGlobalSessions", "50", AppSetting.SettingCategory.VOICE,
            "Max concurrent voice sessions globally", AppSetting.DataType.INTEGER, false));

        // Save settings (idempotent - only creates if doesn't exist)
        int createdCount = 0;
        for (AppSetting setting : settings) {
            if (!appSettingRepo.existsBySettingKey(setting.getSettingKey())) {
                appSettingRepo.save(setting);
                createdCount++;
            }
        }
        
        if (createdCount > 0) {
            log.info("Created {} app settings", createdCount);
        } else {
            log.debug("All app settings already exist");
        }
    }

    /**
     * Helper method to create an AppSetting object
     */
    private AppSetting createSetting(String key, String value, AppSetting.SettingCategory category, 
                                     String description, AppSetting.DataType dataType, boolean isSensitive) {
        AppSetting setting = new AppSetting();
        setting.setSettingKey(key);
        setting.setSettingValue(value);
        setting.setSettingCategory(category);
        setting.setDescription(description);
        setting.setDataType(dataType);
        setting.setIsSensitive(isSensitive);
        return setting;
    }
}

