package com.salonpos.dto;

import com.salonpos.domain.VoucherType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SaveVoucherCatalogRequest(
    @NotBlank String code,
    @NotBlank String name,
    String description,
    @NotNull VoucherType voucherType,
    @NotNull @PositiveOrZero BigDecimal discountValue,
    @Positive int pointsCost,
    BigDecimal minSpend,
    Long branchId,
    Long serviceId,
    Boolean active,
    OffsetDateTime validFrom,
    OffsetDateTime validTo,
    Integer dailyRedemptionLimit
) {
}
