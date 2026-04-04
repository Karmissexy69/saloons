package com.salonpos.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerLogoutRequest(
    @NotBlank String refreshToken
) {
}
