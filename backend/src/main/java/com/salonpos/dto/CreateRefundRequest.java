package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record CreateRefundRequest(
    String receiptNo,
    Long transactionId,
    @NotNull Long approvedBy,
    @NotBlank String reason,
    @PositiveOrZero BigDecimal totalRefund
) {
}
