package com.salonpos.dto;

import com.salonpos.domain.AppointmentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AppointmentResponse(
    Long id,
    String bookingReference,
    Long customerId,
    String customerName,
    String customerPhone,
    String customerEmail,
    String guestName,
    String guestPhone,
    String guestEmail,
    String displayName,
    String displayPhone,
    Long staffId,
    String staffName,
    Long branchId,
    Long serviceId,
    String serviceName,
    String bookingChannel,
    OffsetDateTime startAt,
    OffsetDateTime endAt,
    AppointmentStatus status,
    BigDecimal depositAmount,
    String customerNote,
    String internalNote,
    String cancellationReason,
    Long createdByCustomerId,
    Long convertedTransactionId,
    String receiptNo,
    OffsetDateTime createdAt,
    OffsetDateTime confirmationEmailSentAt,
    OffsetDateTime reminderEmailSentAt
) {
}
