package com.salonpos.dto;

import java.time.OffsetDateTime;

public record AuditLogResponse(
    Long id,
    Long actorUserId,
    String actorUsername,
    String entityType,
    Long entityId,
    String action,
    String beforeJson,
    String afterJson,
    OffsetDateTime createdAt
) {
}
