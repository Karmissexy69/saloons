package com.salonpos.dto;

import com.salonpos.domain.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateAppointmentStatusRequest(
    @NotNull AppointmentStatus status
) {
}
