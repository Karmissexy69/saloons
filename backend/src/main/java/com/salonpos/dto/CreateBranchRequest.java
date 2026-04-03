package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBranchRequest(
    @NotBlank String name,
    String address,
    Boolean active
) {
}
