package com.salonpos.dto;

public record BranchResponse(
    Long id,
    String name,
    String address,
    boolean active,
    String openingTime,
    String closingTime
) {
}
