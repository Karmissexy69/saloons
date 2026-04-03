package com.salonpos.dto;

import java.math.BigDecimal;

public record FaceVerificationResponse(
    boolean verified,
    String failureReason,
    BigDecimal threshold,
    BigDecimal similarity,
    String verificationToken,
    Long verificationId
) {
}
