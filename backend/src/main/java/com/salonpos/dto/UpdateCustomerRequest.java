package com.salonpos.dto;

import jakarta.validation.constraints.Email;
import java.time.LocalDate;

public record UpdateCustomerRequest(
    String name,
    String phone,
    @Email String email,
    LocalDate birthday,
    Long favoriteStaffId,
    Long secondaryFavoriteStaffId,
    Boolean marketingOptIn,
    String notes,
    String status
) {
}
