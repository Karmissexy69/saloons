package com.salonpos.dto;

public record CustomerAuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresInSeconds,
    CustomerResponse customer
) {
}
