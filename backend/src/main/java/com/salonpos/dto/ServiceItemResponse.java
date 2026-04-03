package com.salonpos.dto;

import com.salonpos.domain.CommissionRuleType;
import java.math.BigDecimal;

public record ServiceItemResponse(
    Long id,
    Long categoryId,
    String categoryName,
    String name,
    BigDecimal price,
    Integer durationMinutes,
    CommissionRuleType commissionType,
    BigDecimal commissionValue
) {
}
