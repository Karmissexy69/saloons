package com.salonpos.dto;

public record PublicBranchResponse(
    Long id,
    String name,
    String address,
    String openingTime,
    String closingTime
) {
}
