package com.salonpos.dto;

import java.math.BigDecimal;

public record LoyaltySettingsResponse(
    BigDecimal pointsEarnPercent,
    boolean pointsEnabled,
    boolean voucherRedemptionEnabled,
    String scope,
    int reminderLeadHours
) {
}
