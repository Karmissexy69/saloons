package com.salonpos.dto;

import com.salonpos.domain.AppointmentStatus;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateAppointmentRequest(
    Long customerId,
    Long staffId,
    @NotNull Long branchId,
    Long serviceId,
    @NotNull OffsetDateTime startAt,
    OffsetDateTime endAt,
    AppointmentStatus status,
    BigDecimal depositAmount,
    String notes
) {
}
