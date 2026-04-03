package com.salonpos.dto;

import com.salonpos.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.List;

public record CreateTransactionRequest(
    @NotNull Long branchId,
    Long customerId,
    @NotNull Long cashierId,
    @NotEmpty @Valid List<LineRequest> lines,
    @NotEmpty @Valid List<PaymentRequest> payments,
    @NotNull @PositiveOrZero BigDecimal discountTotal
) {

    public record LineRequest(
        @NotNull Long serviceId,
        @NotNull @Positive Integer qty,
        @NotNull @PositiveOrZero BigDecimal discountAmount,
        Long assignedStaffId
    ) {
    }

    public record PaymentRequest(
        @NotNull PaymentMethod method,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        String referenceNo
    ) {
    }
}
