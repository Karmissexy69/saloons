package com.salonpos.dto;

import com.salonpos.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.List;

public record ConvertAppointmentToBillRequest(
    @NotNull Long cashierId,
    @NotNull @PositiveOrZero BigDecimal discountTotal,
    Long customerVoucherId,
    @NotNull @Valid List<PaymentRequest> payments
) {
    public record PaymentRequest(
        @NotNull PaymentMethod method,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        String referenceNo
    ) {
    }
}
