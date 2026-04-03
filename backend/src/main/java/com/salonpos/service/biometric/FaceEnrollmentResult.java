package com.salonpos.service.biometric;

import java.math.BigDecimal;

public record FaceEnrollmentResult(
    String faceId,
    String externalImageId,
    BigDecimal qualityScore
) {
}
