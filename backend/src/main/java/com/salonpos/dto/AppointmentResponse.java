package com.salonpos.dto;

import com.salonpos.domain.AppointmentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AppointmentResponse(
    Long id,
    Long customerId,
    Long staffId,
    Long branchId,
    Long serviceId,
    OffsetDateTime startAt,
    OffsetDateTime endAt,
    AppointmentStatus status,
    BigDecimal depositAmount,
    String notes,
    Long convertedTransactionId
) {
}
