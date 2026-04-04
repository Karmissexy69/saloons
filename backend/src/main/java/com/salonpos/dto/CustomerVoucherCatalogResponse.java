package com.salonpos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CustomerVoucherCatalogResponse(
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
    OffsetDateTime validFrom,
    OffsetDateTime validTo,
    boolean redeemable,
    String redemptionBlockedReason
) {
}
