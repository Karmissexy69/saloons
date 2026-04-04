package com.salonpos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CustomerOtpRequest(
    @NotBlank @Email String email,
    String deviceLabel
) {
}
