package com.salonpos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PublicCreateAppointmentRequest(
    @NotBlank String guestName,
    @NotBlank String guestPhone,
    @NotBlank @Email String guestEmail,
    Long staffId,
    @NotNull Long branchId,
    Long serviceId,
    @NotNull OffsetDateTime startAt,
    OffsetDateTime endAt,
    BigDecimal depositAmount,
    String customerNote
) {
}
