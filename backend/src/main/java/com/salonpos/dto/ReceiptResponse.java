package com.salonpos.dto;

import java.time.OffsetDateTime;

public record ReceiptResponse(
    String receiptNo,
    String receiptJson,
    String sentStatus,
    OffsetDateTime generatedAt
) {
}
