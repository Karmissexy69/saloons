package com.salonpos.service;

import com.salonpos.domain.AuditLog;
import com.salonpos.dto.AuditLogResponse;
import com.salonpos.dto.PagedResponse;
import com.salonpos.repository.AuditLogRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditLogQueryService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogQueryService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public PagedResponse<AuditLogResponse> list(
        String entityType,
        String action,
        LocalDate from,
        LocalDate to,
        int page,
        int size
    ) {
        OffsetDateTime fromAt = from == null ? null : from.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime toAt = to == null ? null : to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        Page<AuditLog> result = auditLogRepository.search(entityType, action, fromAt, toAt, PageRequest.of(page, size));

        List<AuditLogResponse> items = result.getContent().stream().map(this::toResponse).toList();
        return new PagedResponse<>(items, page, size, result.getTotalElements(), result.getTotalPages());
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        return new AuditLogResponse(
            auditLog.getId(),
            auditLog.getActorUser() == null ? null : auditLog.getActorUser().getId(),
            auditLog.getActorUser() == null ? null : auditLog.getActorUser().getUsername(),
            auditLog.getEntityType(),
            auditLog.getEntityId(),
            auditLog.getAction(),
            auditLog.getBeforeJson(),
            auditLog.getAfterJson(),
            auditLog.getCreatedAt()
        );
    }
}
