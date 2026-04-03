package com.salonpos.dto;

public record StaffFaceReEnrollResponse(
    Long staffId,
    Long faceProfileId,
    String message
) {
}
