package com.siyamuddin.saas.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Setting key is required")
    @Column(name = "setting_key", unique = true, nullable = false, length = 100)
    private String settingKey;

    @Column(name = "setting_value", length = 4000)
    private String settingValue;

    @NotNull(message = "Setting category is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "setting_category", nullable = false, length = 50)
    private SettingCategory settingCategory;

    @Column(name = "description", length = 500)
    private String description;

    @NotNull(message = "Data type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 20)
    private DataType dataType = DataType.STRING;

    @Column(name = "is_sensitive")
    private Boolean isSensitive = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Integer updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum SettingCategory {
        EMAIL,
        SECURITY,
        RATE_LIMIT,
        FILE_STORAGE,
        OAUTH,
        VOICE
    }

    public enum DataType {
        STRING,
        INTEGER,
        BOOLEAN,
        LONG,
        DOUBLE
    }
}

