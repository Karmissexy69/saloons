package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateAppSettingRequest(
    @NotBlank String value
) {
}
