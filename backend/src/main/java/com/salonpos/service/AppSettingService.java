package com.salonpos.service;

import com.salonpos.domain.AppSetting;
import com.salonpos.dto.AppSettingResponse;
import com.salonpos.exception.BadRequestException;
import com.salonpos.repository.AppSettingRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AppSettingService {

    public static final String RECEIPT_BUSINESS_NAME_KEY = "receipt.businessName";
    public static final String DEFAULT_RECEIPT_BUSINESS_NAME = "BrowPOS";

    private final AppSettingRepository appSettingRepository;
    private final AuditLogService auditLogService;

    public AppSettingService(AppSettingRepository appSettingRepository, AuditLogService auditLogService) {
        this.appSettingRepository = appSettingRepository;
        this.auditLogService = auditLogService;
    }

    public List<AppSettingResponse> list() {
        return appSettingRepository.findAllByOrderBySettingKeyAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public String getString(String key, String defaultValue) {
        return appSettingRepository.findById(key)
            .map(AppSetting::getSettingValue)
            .filter(value -> !value.isBlank())
            .orElse(defaultValue);
    }

    @Transactional
    public AppSettingResponse upsert(String key, String value) {
        String normalizedKey = key == null ? "" : key.trim();
        String normalizedValue = value == null ? "" : value.trim();
        if (normalizedKey.isBlank()) {
            throw new BadRequestException("Setting key is required.");
        }
        if (normalizedValue.isBlank()) {
            throw new BadRequestException("Setting value is required.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        AppSetting setting = appSettingRepository.findById(normalizedKey).orElseGet(() -> {
            AppSetting created = new AppSetting();
            created.setSettingKey(normalizedKey);
            created.setCreatedAt(now);
            return created;
        });

        AppSettingResponse before = setting.getSettingValue() == null
            ? null
            : new AppSettingResponse(setting.getSettingKey(), setting.getSettingValue());

        setting.setSettingValue(normalizedValue);
        setting.setUpdatedAt(now);

        AppSetting saved = appSettingRepository.save(setting);
        AppSettingResponse response = toResponse(saved);
        auditLogService.log("APP_SETTING_UPDATED", "app_setting", null, before, response);
        return response;
    }

    private AppSettingResponse toResponse(AppSetting setting) {
        return new AppSettingResponse(setting.getSettingKey(), setting.getSettingValue());
    }
}
