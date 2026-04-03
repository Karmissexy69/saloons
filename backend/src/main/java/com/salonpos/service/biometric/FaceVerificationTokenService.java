package com.salonpos.service.biometric;

import com.salonpos.config.BiometricProperties;
import com.salonpos.exception.BadRequestException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FaceVerificationTokenService {

    private final SecretKey signingKey;
    private final BiometricProperties biometricProperties;

    public FaceVerificationTokenService(
        @Value("${app.jwt.secret}") String jwtSecret,
        BiometricProperties biometricProperties
    ) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.biometricProperties = biometricProperties;
    }

    public String generate(Long staffId, Long verificationId, UUID tokenId, OffsetDateTime issuedAt) {
        OffsetDateTime expiresAt = issuedAt.plusMinutes(biometricProperties.getVerificationTokenTtlMinutes());

        return Jwts.builder()
            .subject(String.valueOf(staffId))
            .claim("verificationId", verificationId)
            .claim("tokenId", tokenId.toString())
            .issuedAt(Date.from(issuedAt.toInstant()))
            .expiration(Date.from(expiresAt.toInstant()))
            .signWith(signingKey)
            .compact();
    }

    public FaceVerificationTokenClaims parse(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

            Long staffId = Long.valueOf(claims.getSubject());
            Number verificationIdValue = claims.get("verificationId", Number.class);
            if (verificationIdValue == null) {
                throw new BadRequestException("Invalid verification token.");
            }
            Long verificationId = verificationIdValue.longValue();
            String tokenId = claims.get("tokenId", String.class);
            return new FaceVerificationTokenClaims(staffId, verificationId, UUID.fromString(tokenId));
        } catch (RuntimeException ex) {
            throw new BadRequestException("Invalid verification token.");
        }
    }
}
