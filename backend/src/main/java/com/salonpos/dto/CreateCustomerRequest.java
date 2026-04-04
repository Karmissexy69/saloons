package com.salonpos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateCustomerRequest(
    @NotBlank String name,
    @NotBlank String phone,
    @Email String email,
    LocalDate birthday,
    Long favoriteStaffId,
    Long secondaryFavoriteStaffId,
    Boolean marketingOptIn,
    String notes
) {
}
