package com.salonpos.dto;

import java.math.BigDecimal;

public record PublicServiceResponse(
    Long id,
    Long categoryId,
    String categoryName,
    String name,
    BigDecimal price,
    Integer durationMinutes
) {
}
