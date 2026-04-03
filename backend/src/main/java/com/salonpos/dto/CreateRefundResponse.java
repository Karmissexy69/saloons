package com.salonpos.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateRefundResponse(
    Long refundId,
    Long transactionId,
    String receiptNo,
    BigDecimal totalRefund,
    OffsetDateTime refundedAt
) {
}
