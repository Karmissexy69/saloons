package com.salonpos.auth;

public record AuthLoginResponse(
    String accessToken,
    String tokenType,
    long expiresInSeconds,
    String username,
    String role
) {
}
