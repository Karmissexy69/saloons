package com.salonpos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CustomerOtpVerifyRequest(
    @NotBlank @Email String email,
    @NotBlank String otpCode,
    String deviceLabel
) {
}
