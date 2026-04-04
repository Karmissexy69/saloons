package com.salonpos.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    public static final String ROLE_CLAIM = "role";
    public static final String PRINCIPAL_TYPE_CLAIM = "principalType";
    public static final String POS_PRINCIPAL_TYPE = "POS";
    public static final String CUSTOMER_PRINCIPAL_TYPE = "CUSTOMER";

    private final SecretKey secretKey;
    private final long expirationSeconds;

    public JwtService(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-seconds:3600}") long expirationSeconds
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(String username, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim(ROLE_CLAIM, role)
            .claim(PRINCIPAL_TYPE_CLAIM, POS_PRINCIPAL_TYPE)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expirationSeconds)))
            .signWith(secretKey)
            .compact();
    }

    public String generateCustomerToken(Long customerId) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(String.valueOf(customerId))
            .claim(ROLE_CLAIM, "CUSTOMER")
            .claim(PRINCIPAL_TYPE_CLAIM, CUSTOMER_PRINCIPAL_TYPE)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expirationSeconds)))
            .signWith(secretKey)
            .compact();
    }

    public String extractUsername(String token) {
        return claims(token).getSubject();
    }

    public String extractRole(String token) {
        return claims(token).get(ROLE_CLAIM, String.class);
    }

    public String extractPrincipalType(String token) {
        return claims(token).get(PRINCIPAL_TYPE_CLAIM, String.class);
    }

    public boolean isTokenValid(String token, String username) {
        Claims claims = claims(token);
        return claims.getSubject().equals(username) && claims.getExpiration().after(new Date());
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    private Claims claims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
