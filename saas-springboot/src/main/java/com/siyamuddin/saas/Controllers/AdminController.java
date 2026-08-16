package com.siyamuddin.saas.Controllers;

import com.siyamuddin.saas.Config.AppConstants;
import com.siyamuddin.saas.Entity.AppSetting;
import com.siyamuddin.saas.Entity.User;
import com.siyamuddin.saas.Payloads.ApiResponse;
import com.siyamuddin.saas.Payloads.PagedResponse;
import com.siyamuddin.saas.Payloads.Settings.*;
import com.siyamuddin.saas.Payloads.UserPayload.UserDto;
import com.siyamuddin.saas.Payloads.UserPayload.ValidationGroups;
import com.siyamuddin.saas.Services.AppSettingsService;
import com.siyamuddin.saas.Services.AuditService;
import com.siyamuddin.saas.Services.UserProfilePhotoService;
import com.siyamuddin.saas.Services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@SecurityRequirement(name = "JWT-Auth")
@Tag(name = "Admin - User Management", description = "Admin-only endpoints for managing all users")
public class AdminController {
    
    private final UserService userService;
    private final AuditService auditService;
    private final com.siyamuddin.saas.Config.MetricsConfig.BusinessMetrics businessMetrics;
    private final UserProfilePhotoService userProfilePhotoService;
    private final AppSettingsService appSettingsService;

    public AdminController(
            UserService userService,
            AuditService auditService,
            com.siyamuddin.saas.Config.MetricsConfig.BusinessMetrics businessMetrics,
            UserProfilePhotoService userProfilePhotoService,
            AppSettingsService appSettingsService) {
        this.userService = userService;
        this.auditService = auditService;
        this.businessMetrics = businessMetrics;
        this.userProfilePhotoService = userProfilePhotoService;
        this.appSettingsService = appSettingsService;
    }

    @Operation(
        summary = "Get user by ID",
        description = "Retrieve user information by user ID. Typically requires admin role."
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", 
            description = "User found",
            content = @Content(schema = @Schema(implementation = UserDto.class))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404", 
            description = "User not found"
        )
    })
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUser(
            @Parameter(description = "User ID", required = true)
            @PathVariable Integer userId)
    {
        UserDto userDto = this.userService.getUserById(userId);
        return new ResponseEntity<>(userDto, HttpStatus.OK);
    }

    @Operation(
        summary = "Get all users",
        description = "Retrieve paginated list of all users with sorting support. Requires admin role."
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", 
            description = "Users retrieved successfully",
            content = @Content(schema = @Schema(implementation = PagedResponse.class))
        )
    })
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/")
    public ResponseEntity<PagedResponse<UserDto>> getAllUser(
            @Parameter(description = "Page number (0-indexed)", example = "0")
            @RequestParam(value = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) Integer pageNumber,
            @Parameter(description = "Page size", example = "10")
            @RequestParam(value = "pageSize", defaultValue = AppConstants.PAGE_SIZE, required = false) Integer pageSize,
            @Parameter(description = "Sort field", example = "id")
            @RequestParam(value = "sortBy", defaultValue = "id", required = false) String sortBy,
            @Parameter(description = "Sort direction (asc/desc)", example = "asc")
            @RequestParam(value = "sortDirec", defaultValue = AppConstants.SORT_DIREC, required = false) String sortDirec)
    {
        PagedResponse<UserDto> pagedResponse = this.userService.getAllUser(pageNumber, pageSize, sortBy, sortDirec);
        return new ResponseEntity<>(pagedResponse, HttpStatus.OK);
    }

    @Operation(
        summary = "Search users by name",
        description = "Search users by name containing the provided keywords. Requires admin role."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/search/{keywords}")
    public ResponseEntity<List<UserDto>> searchUserByName(
            @Parameter(description = "Search keywords", required = true)
            @PathVariable("keywords") String keywords) {
        List<UserDto> userDtos = this.userService.searchUserByName(keywords);
        return new ResponseEntity<>(userDtos, HttpStatus.OK);
    }

    @Operation(
        summary = "Update user",
        description = "Update user information. Requires admin role or ownership of the user account."
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", 
            description = "User updated successfully",
            content = @Content(schema = @Schema(implementation = UserDto.class))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "403", 
            description = "Access denied"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404", 
            description = "User not found"
        )
    })
    @PreAuthorize("@authz.canModifyUser(authentication,#userId)")
    @PutMapping("/{userId}")
    public ResponseEntity<UserDto> updateUser(
            @Valid @org.springframework.validation.annotation.Validated(ValidationGroups.Update.class) @RequestBody UserDto userDto,
            @Parameter(description = "User ID", required = true)
            @PathVariable Integer userId)
    {
        UserDto updatedUserDto = this.userService.updateUser(userDto, userId);
        // Audit user update
        try {
            User user = userService.getUserEntityById(userId);
            auditService.logUserAction(user, "USER_UPDATED", "USER", userId);
            businessMetrics.incrementUserUpdate();
        } catch (Exception e) {
            // log.warn("Could not audit user update: {}", e.getMessage());
        }
        return ResponseEntity.ok(updatedUserDto);
    }

    @Operation(
        summary = "Delete user",
        description = "Delete a user account. Requires admin role or ownership of the user account."
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200", 
            description = "User deleted successfully"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "403", 
            description = "Access denied"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404", 
            description = "User not found"
        )
    })
    @PreAuthorize("@authz.canModifyUser(authentication,#userId)")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse> deleteUser(
            @Parameter(description = "User ID", required = true)
            @PathVariable Integer userId)
    {
        // Get user before deletion for audit
        try {
            User user = userService.getUserEntityById(userId);
            this.userService.deleteUser(userId);
            // Audit user deletion
            auditService.logUserAction(user, "USER_DELETED", "USER", userId);
            businessMetrics.incrementUserDelete();
        } catch (Exception e) {
            // If user not found, still try to delete (idempotent)
            this.userService.deleteUser(userId);
        }
        return new ResponseEntity<>(new ApiResponse("User deleted successfully", true), HttpStatus.OK);
    }

    @Operation(
        summary = "Upload user profile photo",
        description = "Upload or replace a user's profile photo. Requires admin role or ownership of the user account."
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "Profile photo updated",
            content = @Content(schema = @Schema(implementation = UserDto.class))
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "400",
            description = "Invalid file provided"
        )
    })
    @PreAuthorize("@authz.canModifyUser(authentication,#userId)")
    @PostMapping(
        value = "/{userId}/profile-photo",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<UserDto> uploadProfilePhoto(
            @Parameter(description = "User ID", required = true)
            @PathVariable Integer userId,
            @Parameter(description = "Profile photo file (jpg, png, webp, gif, avif, pdf)", required = true)
            @RequestPart("file") MultipartFile file) {

        UserDto updated = userProfilePhotoService.uploadProfilePhoto(userId, file);
        try {
            User user = userService.getUserEntityById(userId);
            auditService.logUserAction(user, "PROFILE_PHOTO_UPDATED", "USER", userId);
        } catch (Exception e) {
            // Best-effort auditing
        }
        return ResponseEntity.ok(updated);
    }

    // ==================== Application Settings Endpoints ====================

    @Operation(
        summary = "Get all application settings",
        description = "Retrieve all application settings grouped by category. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/settings")
    public ResponseEntity<AllSettingsResponse> getAllSettings() {
        AllSettingsResponse settings = appSettingsService.getAllSettings();
        return ResponseEntity.ok(settings);
    }

    @Operation(
        summary = "Get settings by category",
        description = "Retrieve settings for a specific category. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/settings/{category}")
    public ResponseEntity<List<AppSettingDto>> getSettingsByCategory(
            @PathVariable AppSetting.SettingCategory category) {
        List<AppSettingDto> settings = appSettingsService.getSettingsByCategory(category);
        return ResponseEntity.ok(settings);
    }

    @Operation(
        summary = "Update email settings",
        description = "Update email/SMTP configuration. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/settings/email")
    public ResponseEntity<EmailSettingsDto> updateEmailSettings(
            @Valid @RequestBody EmailSettingsDto settings,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        EmailSettingsDto updated = appSettingsService.updateEmailSettings(settings, admin.getId());
        return ResponseEntity.ok(updated);
    }

    @Operation(
        summary = "Update security settings",
        description = "Update security and password policy configuration. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/settings/security")
    public ResponseEntity<SecuritySettingsDto> updateSecuritySettings(
            @Valid @RequestBody SecuritySettingsDto settings,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        SecuritySettingsDto updated = appSettingsService.updateSecuritySettings(settings, admin.getId());
        return ResponseEntity.ok(updated);
    }

    @Operation(
        summary = "Update rate limit settings",
        description = "Update API rate limiting configuration. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/settings/rate-limits")
    public ResponseEntity<RateLimitSettingsDto> updateRateLimitSettings(
            @Valid @RequestBody RateLimitSettingsDto settings,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        RateLimitSettingsDto updated = appSettingsService.updateRateLimitSettings(settings, admin.getId());
        return ResponseEntity.ok(updated);
    }

    @Operation(
        summary = "Update file storage settings",
        description = "Update file storage configuration (local/S3). Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/settings/file-storage")
    public ResponseEntity<FileStorageSettingsDto> updateFileStorageSettings(
            @Valid @RequestBody FileStorageSettingsDto settings,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        FileStorageSettingsDto updated = appSettingsService.updateFileStorageSettings(settings, admin.getId());
        return ResponseEntity.ok(updated);
    }

    @Operation(
        summary = "Update OAuth settings",
        description = "Update Google OAuth configuration. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/settings/oauth")
    public ResponseEntity<OAuthSettingsDto> updateOAuthSettings(
            @Valid @RequestBody OAuthSettingsDto settings,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        OAuthSettingsDto updated = appSettingsService.updateOAuthSettings(settings, admin.getId());
        return ResponseEntity.ok(updated);
    }

    @Operation(
        summary = "Update voice settings",
        description = "Update Gemini Live / free-beta voice configuration. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/settings/voice")
    public ResponseEntity<VoiceSettingsDto> updateVoiceSettings(
            @Valid @RequestBody VoiceSettingsDto settings,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        VoiceSettingsDto updated = appSettingsService.updateVoiceSettings(settings, admin.getId());
        return ResponseEntity.ok(updated);
    }

    @Operation(
        summary = "Test email connection",
        description = "Test SMTP connection with provided settings. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PostMapping("/settings/test-email")
    public ResponseEntity<ApiResponse> testEmailConnection(
            @Valid @RequestBody EmailSettingsDto settings) {
        boolean success = appSettingsService.testEmailConnection(settings);
        return ResponseEntity.ok(new ApiResponse(
            success ? "Email connection successful" : "Email connection failed",
            success
        ));
    }

    @Operation(
        summary = "Test OAuth configuration",
        description = "Validate OAuth configuration. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PostMapping("/settings/test-oauth")
    public ResponseEntity<ApiResponse> testOAuthConfiguration(
            @Valid @RequestBody OAuthSettingsDto settings) {
        boolean success = appSettingsService.testOAuthConfiguration(settings);
        return ResponseEntity.ok(new ApiResponse(
            success ? "OAuth configuration is valid" : "OAuth configuration is invalid",
            success
        ));
    }

    @Operation(
        summary = "Reset settings to defaults",
        description = "Reset a category of settings to default values. Admin only."
    )
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PostMapping("/settings/reset/{category}")
    public ResponseEntity<ApiResponse> resetSettings(
            @PathVariable AppSetting.SettingCategory category,
            Authentication authentication) {
        User admin = userService.getUserEntityByEmail(authentication.getName());
        appSettingsService.resetToDefaults(category, admin.getId());
        return ResponseEntity.ok(new ApiResponse(
            "Settings reset to defaults successfully",
            true
        ));
    }
}

