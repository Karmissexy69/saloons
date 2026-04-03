package com.salonpos.dto;

import com.salonpos.domain.CommissionRuleType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record CreateServiceRequest(
    Long categoryId,
    String categoryName,
    @NotBlank String name,
    @NotNull @DecimalMin("0.01") BigDecimal price,
    @Positive Integer durationMinutes,
    CommissionRuleType commissionType,
    @PositiveOrZero BigDecimal commissionValue,
    Boolean active
) {
}
