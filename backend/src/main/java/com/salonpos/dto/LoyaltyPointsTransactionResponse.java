package com.salonpos.dto;

import java.time.OffsetDateTime;

public record LoyaltyPointsTransactionResponse(
    Long id,
    String entryType,
    int pointsDelta,
    int balanceAfter,
    String remarks,
    Long transactionId,
    Long refundId,
    Long customerVoucherId,
    OffsetDateTime createdAt
) {
}
