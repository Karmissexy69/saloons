package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelAppointmentRequest(
    @NotBlank String reason
) {
}
