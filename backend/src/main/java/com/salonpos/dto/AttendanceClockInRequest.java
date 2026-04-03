package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AttendanceClockInRequest(
    @NotNull Long staffId,
    @NotNull Long branchId,
    @NotBlank String verificationToken
) {
}
