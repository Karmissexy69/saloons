package com.salonpos.dto;

import java.math.BigDecimal;

public record SalesSummaryResponse(
    BigDecimal grossSales,
    BigDecimal netSales,
    BigDecimal discountTotal,
    BigDecimal refundTotal,
    BigDecimal averageBill,
    long transactionCount
) {
}
