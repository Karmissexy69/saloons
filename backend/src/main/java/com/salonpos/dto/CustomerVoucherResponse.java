package com.salonpos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CustomerVoucherResponse(
    Long id,
    Long customerId,
    Long voucherCatalogId,
    String code,
    String name,
    String voucherType,
    BigDecimal discountValue,
    BigDecimal minSpend,
    Long branchId,
    Long serviceId,
    String serviceName,
    String status,
    OffsetDateTime expiresAt,
    OffsetDateTime redeemedAt,
    OffsetDateTime usedAt
) {
}
