package com.salonpos.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CustomerCreateAppointmentRequest(
    Long staffId,
    @NotNull Long branchId,
    Long serviceId,
    @NotNull OffsetDateTime startAt,
    OffsetDateTime endAt,
    BigDecimal depositAmount,
    String customerNote
) {
}
