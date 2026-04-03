package com.salonpos.dto;

public record StaffProfileResponse(
    Long id,
    String displayName,
    String roleType,
    boolean active
) {
}
