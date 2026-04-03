package com.salonpos.dto;

import jakarta.validation.constraints.NotNull;

public record AttendanceActionRequest(
    @NotNull Long staffId,
    Long branchId
) {
}
