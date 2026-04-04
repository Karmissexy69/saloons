package com.salonpos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record VoucherCatalogResponse(
    Long id,
    String code,
    String name,
    String description,
    String voucherType,
    BigDecimal discountValue,
    int pointsCost,
    BigDecimal minSpend,
    Long branchId,
    Long serviceId,
    String serviceName,
    boolean active,
    OffsetDateTime validFrom,
    OffsetDateTime validTo,
    Integer dailyRedemptionLimit
) {
}
