package com.salonpos.service;

import com.salonpos.dto.LoyaltySettingsResponse;
import com.salonpos.dto.UpdateLoyaltySettingsRequest;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class LoyaltySettingsService {

    public static final String POINTS_EARN_PERCENT_KEY = "loyalty.pointsEarnPercent";
    public static final String POINTS_ENABLED_KEY = "loyalty.pointsEnabled";
    public static final String VOUCHER_REDEMPTION_ENABLED_KEY = "loyalty.voucherRedemptionEnabled";
    public static final String SCOPE_KEY = "loyalty.scope";
    public static final String REMINDER_LEAD_HOURS_KEY = "appointments.reminderLeadHours";

    private final AppSettingService appSettingService;

    public LoyaltySettingsService(AppSettingService appSettingService) {
        this.appSettingService = appSettingService;
    }

    public LoyaltySettingsResponse get() {
        return new LoyaltySettingsResponse(
            getPointsEarnPercent(),
            getBoolean(POINTS_ENABLED_KEY, true),
            getBoolean(VOUCHER_REDEMPTION_ENABLED_KEY, true),
            appSettingService.getString(SCOPE_KEY, "GLOBAL"),
            getInt(REMINDER_LEAD_HOURS_KEY, 24)
        );
    }

    public LoyaltySettingsResponse update(UpdateLoyaltySettingsRequest request) {
        appSettingService.upsert(POINTS_EARN_PERCENT_KEY, request.pointsEarnPercent().stripTrailingZeros().toPlainString());
        appSettingService.upsert(POINTS_ENABLED_KEY, String.valueOf(request.pointsEnabled()));
        appSettingService.upsert(VOUCHER_REDEMPTION_ENABLED_KEY, String.valueOf(request.voucherRedemptionEnabled()));
        appSettingService.upsert(SCOPE_KEY, "GLOBAL");
        appSettingService.upsert(REMINDER_LEAD_HOURS_KEY, String.valueOf(request.reminderLeadHours()));
        return get();
    }

    public BigDecimal getPointsEarnPercent() {
        return parseDecimal(appSettingService.getString(POINTS_EARN_PERCENT_KEY, "10"), BigDecimal.TEN);
    }

    public boolean isPointsEnabled() {
        return getBoolean(POINTS_ENABLED_KEY, true);
    }

    public boolean isVoucherRedemptionEnabled() {
        return getBoolean(VOUCHER_REDEMPTION_ENABLED_KEY, true);
    }

    public int getReminderLeadHours() {
        return getInt(REMINDER_LEAD_HOURS_KEY, 24);
    }

    private boolean getBoolean(String key, boolean defaultValue) {
        return Boolean.parseBoolean(appSettingService.getString(key, String.valueOf(defaultValue)));
    }

    private int getInt(String key, int defaultValue) {
        try {
            return Integer.parseInt(appSettingService.getString(key, String.valueOf(defaultValue)));
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private BigDecimal parseDecimal(String value, BigDecimal defaultValue) {
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }
}
