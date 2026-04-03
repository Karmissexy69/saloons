package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AttendanceClockOutRequest(
    @NotNull Long staffId,
    @NotBlank String verificationToken
) {
}
