package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerTokenRefreshRequest(
    @NotBlank String refreshToken
) {
}
