package com.salonpos.dto;

import java.math.BigDecimal;

public record CommissionStatementResponse(
    Long staffId,
    BigDecimal earned,
    BigDecimal reversal,
    BigDecimal net
) {
}
