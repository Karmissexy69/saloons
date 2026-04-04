package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record PointsAdjustmentRequest(
    int pointsDelta,
    @NotBlank String remarks
) {
}
