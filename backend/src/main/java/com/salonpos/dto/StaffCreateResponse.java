package com.salonpos.dto;

public record StaffCreateResponse(
    Long id,
    String displayName,
    String roleType,
    boolean active,
    boolean faceEnrolled
) {
}
