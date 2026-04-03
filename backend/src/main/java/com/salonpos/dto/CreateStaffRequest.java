package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateStaffRequest(
    @NotBlank String displayName,
    @NotBlank String roleType,
    Boolean active
) {
}
