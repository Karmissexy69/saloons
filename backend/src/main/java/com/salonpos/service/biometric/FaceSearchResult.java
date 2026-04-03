package com.salonpos.service.biometric;

import com.salonpos.domain.FaceVerificationFailureReason;
import java.math.BigDecimal;

public record FaceSearchResult(
    boolean matched,
    BigDecimal similarity,
    String rekognitionRequestId,
    FaceVerificationFailureReason failureReason
) {
}
