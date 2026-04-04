package com.salonpos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record CustomerResponse(
    Long id,
    String name,
    String phone,
    String phoneNormalized,
    String email,
    LocalDate birthday,
    String notes,
    boolean marketingOptIn,
    String status,
    Long favoriteStaffId,
    String favoriteStaffName,
    Long secondaryFavoriteStaffId,
    String secondaryFavoriteStaffName,
    int pointsBalance,
    BigDecimal totalSpend,
    int totalVisits,
    OffsetDateTime lastVisitAt
) {
}
