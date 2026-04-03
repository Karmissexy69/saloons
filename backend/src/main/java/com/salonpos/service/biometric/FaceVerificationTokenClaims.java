package com.salonpos.service.biometric;

import java.util.UUID;

public record FaceVerificationTokenClaims(
    Long staffId,
    Long verificationId,
    UUID tokenId
) {
}
