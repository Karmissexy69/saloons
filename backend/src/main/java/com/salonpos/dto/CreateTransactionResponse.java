package com.salonpos.dto;

import java.math.BigDecimal;

public record CreateTransactionResponse(
    Long transactionId,
    String receiptNo,
    BigDecimal subtotal,
    BigDecimal discountTotal,
    BigDecimal total
) {
}
