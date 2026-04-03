package com.salonpos.dto;

import com.salonpos.domain.TransactionStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReceiptHistoryItemResponse(
    String receiptNo,
    OffsetDateTime generatedAt,
    Long branchId,
    Long cashierId,
    BigDecimal total,
    String sentStatus,
    TransactionStatus transactionStatus
) {
}
