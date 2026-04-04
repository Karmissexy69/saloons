package com.salonpos.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record UpdateLoyaltySettingsRequest(
    @NotNull @PositiveOrZero BigDecimal pointsEarnPercent,
    boolean pointsEnabled,
    boolean voucherRedemptionEnabled,
    @PositiveOrZero int reminderLeadHours
) {
}
