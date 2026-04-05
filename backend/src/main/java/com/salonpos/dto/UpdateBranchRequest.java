package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateBranchRequest(
    @NotBlank String name,
    String address,
    Boolean active,
    String openingTime,
    String closingTime
) {
}
