package com.salonpos.dto;

public record OtpChallengeResponse(
    String message,
    long expiresInSeconds
) {
}
